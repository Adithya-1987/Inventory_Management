// ALL data access lives here, connected to Supabase.
import { cache } from "react";
import type { Component, ComponentRequest, RequestStatus, Transaction, TxType } from "./types";
import { REQUEST_STATUSES } from "./types";
import { day } from "./format";
import { createAdminClient } from "./supabase/admin";

export const LOW_STOCK = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_EXTS = ["csv", "xlsx", "xls", "pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"];

function fail(msg: string): never {
  throw new Error(msg);
}

function posInt(n: number | undefined, what: string) {
  if (n === undefined || !Number.isInteger(n) || n <= 0) fail(`${what} must be a whole number above 0`);
  return n;
}

function nonNeg(n: number | undefined, what: string) {
  if (n === undefined || !Number.isFinite(n) || n < 0) fail(`${what} must be 0 or more`);
  return n;
}

export type ComponentInput = Omit<Component, "id">;

function cleanComponent(input: ComponentInput): ComponentInput {
  const name = input.name.trim() || fail("Name is required");
  const quantity = input.quantity ?? 0;
  if (!Number.isInteger(quantity) || quantity < 0) fail("Quantity must be a whole number, 0 or more");
  return {
    name,
    category: (input.category ?? "").trim(),
    location: (input.location ?? "").trim(),
    quantity,
    unit_cost: nonNeg(input.unit_cost, "Unit cost"),
    sell_price: nonNeg(input.sell_price, "Sell price"),
  };
}

// ---------- components ----------
export const getComponents = cache(async (search = ""): Promise<Component[]> => {
  const supabase = createAdminClient();
  let query = supabase.from("components").select("*").order("name");
  const q = search.trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching components:", error);
    return [];
  }
  return data ?? [];
});

export async function addComponent(input: ComponentInput) {
  const supabase = createAdminClient();
  const clean = cleanComponent(input);
  const { data, error } = await supabase.from("components").insert(clean).select().single();
  if (error) fail(error.message);
  return data;
}

export async function updateComponent(id: string, input: ComponentInput) {
  const supabase = createAdminClient();
  const clean = cleanComponent(input);
  const { data, error } = await supabase.from("components").update(clean).eq("id", id).select().single();
  if (error) fail(error.message);
  return data;
}

export async function deleteComponent(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("components").delete().eq("id", id);
  if (error) fail(error.message);
}

// ---------- stock movements ----------
type Movement = { componentId: string; qty?: number; amount?: number; note?: string; source?: Transaction["source"] };

export async function recordSale({ componentId, qty, amount, note = "", source = "manual" }: Movement) {
  const supabase = createAdminClient();
  const n = posInt(qty, "Quantity");
  const { data: comp } = await supabase.from("components").select("quantity, sell_price, name").eq("id", componentId).single();
  if (!comp) fail("Component not found");
  if (n > comp.quantity) fail(`Only ${comp.quantity} ${comp.name} in stock`);
  const total = amount === undefined ? n * (comp.sell_price ?? 0) : nonNeg(amount, "Amount");

  await supabase.from("components").update({ quantity: comp.quantity - n }).eq("id", componentId);
  const { data: tx, error } = await supabase.from("transactions").insert({
    type: "sale",
    component_id: componentId,
    qty: n,
    amount: total,
    note,
    source,
  }).select().single();
  if (error) fail(error.message);
  return tx;
}

export async function recordPurchase({ componentId, qty, amount, note = "", source = "manual" }: Movement) {
  const supabase = createAdminClient();
  const n = posInt(qty, "Quantity");
  const { data: comp } = await supabase.from("components").select("quantity, unit_cost").eq("id", componentId).single();
  if (!comp) fail("Component not found");
  const total = amount === undefined ? n * (comp.unit_cost ?? 0) : nonNeg(amount, "Amount");

  await supabase.from("components").update({ quantity: comp.quantity + n }).eq("id", componentId);
  const { data: tx, error } = await supabase.from("transactions").insert({
    type: "purchase",
    component_id: componentId,
    qty: n,
    amount: -total,
    note,
    source,
  }).select().single();
  if (error) fail(error.message);
  return tx;
}

export async function adjustStock({ componentId, qty, note = "", source = "manual" }: Movement) {
  const supabase = createAdminClient();
  if (!qty || !Number.isInteger(qty)) fail("Adjustment must be a non-zero whole number");
  const { data: comp } = await supabase.from("components").select("quantity, name").eq("id", componentId).single();
  if (!comp) fail("Component not found");
  if (comp.quantity + qty < 0) fail(`Only ${comp.quantity} ${comp.name} in stock`);

  await supabase.from("components").update({ quantity: comp.quantity + qty }).eq("id", componentId);
  const { data: tx, error } = await supabase.from("transactions").insert({
    type: "adjust",
    component_id: componentId,
    qty,
    amount: 0,
    note,
    source,
  }).select().single();
  if (error) fail(error.message);
  return tx;
}

// ---------- transactions & stats ----------
export type TxFilter = { from?: string; to?: string; type?: string; componentId?: string };

export const getTransactions = cache(async (f: TxFilter = {}, limit = 200): Promise<Transaction[]> => {
  const supabase = createAdminClient();
  let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (f.from) query = query.gte("created_at", f.from);
  if (f.to) query = query.lte("created_at", f.to + "T23:59:59.999Z");
  if (f.type) query = query.eq("type", f.type);
  if (f.componentId) query = query.eq("component_id", f.componentId);
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return data ?? [];
});

export const getStats = cache(async () => {
  const supabase = createAdminClient();
  const today = day(new Date().toISOString());
  const yesterday = day(new Date(Date.now() - 86_400_000).toISOString());

  const [{ data: transactions }, { data: components }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("components").select("*"),
  ]);

  const txs: Transaction[] = transactions ?? [];
  const comps: Component[] = components ?? [];

  const sales = txs.filter((t) => t.type === "sale");
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const todaySales = sales.filter((t) => day(t.created_at) === today);

  const since = Date.now() - 30 * 86_400_000;
  const sold = new Map<string, { qty: number; amount: number }>();
  for (const t of sales) {
    if (Date.parse(t.created_at) < since) continue;
    const s = sold.get(t.component_id) ?? { qty: 0, amount: 0 };
    sold.set(t.component_id, { qty: s.qty + t.qty, amount: s.amount + Number(t.amount) });
  }

  const names = new Map(comps.map((c) => [c.id, c.name]));
  const topSelling = [...sold]
    .map(([id, s]) => ({ name: names.get(id) ?? "?", ...s }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    balance: sum(txs),
    todayNet: sum(txs.filter((t) => day(t.created_at) === today)),
    todaySales: sum(todaySales),
    todaySaleCount: todaySales.length,
    yesterdaySales: sum(sales.filter((t) => day(t.created_at) === yesterday)),
    lowStock: comps.filter((c) => c.quantity < LOW_STOCK).sort((a, b) => a.quantity - b.quantity),
    topSelling,
  };
});

// ---------- requests ----------
export const getRequests = cache(async (): Promise<ComponentRequest[]> => {
  const supabase = createAdminClient();
  const { data } = await supabase.from("requests").select("*").order("created_at", { ascending: false });
  return data ?? [];
});

export async function addRequest(input: { branch: string; section: string; mentor: string; message: string; file: File | null }) {
  const supabase = createAdminClient();
  const branch = input.branch.trim() || fail("Branch is required");
  const section = input.section.trim() || fail("Section is required");
  const mentor = input.mentor.trim() || fail("Mentor is required");
  const message = input.message.trim();
  const file = input.file && input.file.size > 0 ? input.file : null;
  if (!message && !file) fail("Write a message or attach a file");
  if (branch.length > 50 || section.length > 20 || mentor.length > 100 || message.length > 5000) fail("Input too long");
  if (file) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FILE_EXTS.includes(ext)) fail(`File type not allowed. Use: ${FILE_EXTS.join(", ")}`);
    if (file.size > MAX_FILE_BYTES) fail("File must be 5MB or smaller");
  }

  let filePath: string | null = null;
  if (file) {
    const key = `uploads/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("request-files").upload(key, file);
    if (!uploadError) filePath = key;
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({
      branch,
      section,
      mentor,
      message,
      file_path: filePath,
      file_name: file?.name ?? null,
      status: "new",
      admin_note: "",
    })
    .select()
    .single();

  if (error) fail(error.message);
  return data;
}

export async function updateRequest(id: string, input: { status: string; admin_note: string }) {
  const supabase = createAdminClient();
  if (!REQUEST_STATUSES.includes(input.status as RequestStatus)) fail("Invalid status");
  const { data, error } = await supabase
    .from("requests")
    .update({
      status: input.status,
      admin_note: input.admin_note.trim(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) fail(error.message);
  return data;
}

export async function getRequestFile(id: string) {
  const supabase = createAdminClient();
  const { data: req } = await supabase.from("requests").select("file_path, file_name").eq("id", id).single();
  if (!req?.file_path) return null;
  const { data, error } = await supabase.storage.from("request-files").download(req.file_path);
  if (error || !data) return null;
  return {
    name: req.file_name ?? "file",
    bytes: await data.arrayBuffer(),
  };
}
