// ALL data access lives here. The database step rewrites this file against Supabase;
// pages and actions keep calling the same functions.
import type { Component, ComponentRequest, RequestStatus, Transaction, TxType } from "./types";
import { REQUEST_STATUSES } from "./types";
import { day } from "./format";

export const LOW_STOCK = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_EXTS = ["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg", "webp"];

type StoredFile = { name: string; type: string; bytes: ArrayBuffer };
type Store = {
  components: Component[];
  transactions: Transaction[];
  requests: ComponentRequest[];
  files: Map<string, StoredFile>; // request id -> uploaded file
};

const newId = () => crypto.randomUUID();
const ago = (days: number, hours = 0) =>
  new Date(Date.now() - (days * 24 + hours) * 3_600_000).toISOString();

function seed(): Store {
  const c = (name: string, category: string, quantity: number, unit_cost: number, sell_price: number, location: string): Component =>
    ({ id: newId(), name, category, quantity, unit_cost, sell_price, location });
  const components = [
    c("LM358", "IC", 42, 6, 12, "Drawer A1"),
    c("NE555", "IC", 7, 5, 10, "Drawer A1"),
    c("1N4007", "Diode", 300, 0.5, 1, "Drawer B2"),
    c("BC547", "Transistor", 150, 1, 2, "Drawer B3"),
    c("10k Resistor", "Resistor", 900, 0.2, 0.5, "Drawer C1"),
    c("100uF 25V Capacitor", "Capacitor", 60, 2, 4, "Drawer C2"),
    c("7805 Regulator", "IC", 4, 8, 15, "Drawer A2"),
    c("Arduino Nano", "Board", 12, 220, 320, "Shelf 1"),
    c("ESP32 DevKit", "Board", 3, 380, 520, "Shelf 1"),
    c("HC-05 Bluetooth", "Module", 9, 210, 300, "Shelf 2"),
  ];
  const [lm358, ne555, , bc547, , , reg, nano, esp32] = components;
  const t = (type: TxType, comp: Component, qty: number, amount: number, at: string, note = ""): Transaction =>
    ({ id: newId(), type, component_id: comp.id, qty, amount, note, source: "manual", created_at: at });
  const transactions = [
    t("purchase", nano, 10, -2200, ago(6), "Opening stock"),
    t("purchase", esp32, 5, -1900, ago(6), "Opening stock"),
    t("sale", nano, 3, 960, ago(4)),
    t("sale", lm358, 8, 96, ago(3)),
    t("sale", esp32, 2, 1040, ago(2)),
    t("adjust", reg, -1, 0, ago(1), "Damaged"),
    t("sale", lm358, 4, 48, ago(1, 2)),
    t("sale", bc547, 20, 40, ago(0, 3)),
    t("sale", ne555, 5, 50, ago(0, 1), "College lab order"),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const requests: ComponentRequest[] = [
    { id: newId(), branch: "ECE", section: "A", mentor: "Dr. Rao", message: "Need 20x IRF540N MOSFETs for a project. Any stock?", file_name: null, status: "new", admin_note: "", created_at: ago(0, 5) },
    { id: newId(), branch: "EEE", section: "B", mentor: "Prof. Lakshmi", message: "Looking for a 16x2 LCD with I2C backpack.", file_name: null, status: "ordered", admin_note: "Supplier ETA Friday", created_at: ago(2) },
  ];
  return { components, transactions, requests, files: new Map() };
}

// Survive dev hot-reloads; resets on server restart (by design until the DB step).
const g = globalThis as typeof globalThis & { __imStore?: Store };
const db = (g.__imStore ??= seed());

// ---------- helpers ----------
function fail(msg: string): never {
  throw new Error(msg);
}
const findComponent = (id: string) => db.components.find((c) => c.id === id) ?? fail("Component not found");
function posInt(n: number | undefined, what: string) {
  if (n === undefined || !Number.isInteger(n) || n <= 0) fail(`${what} must be a whole number above 0`);
  return n;
}
function nonNeg(n: number | undefined, what: string) {
  if (n === undefined || !Number.isFinite(n) || n < 0) fail(`${what} must be 0 or more`);
  return n;
}
function log(tx: Omit<Transaction, "id" | "created_at">) {
  const row: Transaction = { ...tx, id: newId(), created_at: new Date().toISOString() };
  db.transactions.unshift(row);
  return row;
}

// ---------- components ----------
export type ComponentInput = Omit<Component, "id">;

function cleanComponent(input: ComponentInput, exceptId?: string): ComponentInput {
  const name = input.name.trim() || fail("Name is required");
  if (db.components.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase()))
    fail(`"${name}" already exists`);
  const quantity = input.quantity;
  if (!Number.isInteger(quantity) || quantity < 0) fail("Quantity must be a whole number, 0 or more");
  return {
    name,
    category: input.category.trim(),
    location: input.location.trim(),
    quantity,
    unit_cost: nonNeg(input.unit_cost, "Unit cost"),
    sell_price: nonNeg(input.sell_price, "Sell price"),
  };
}

export async function getComponents(search = ""): Promise<Component[]> {
  const q = search.trim().toLowerCase();
  return db.components
    .filter((c) => !q || [c.name, c.category, c.location].some((f) => f.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addComponent(input: ComponentInput) {
  const row = { id: newId(), ...cleanComponent(input) };
  db.components.push(row);
  if (row.quantity) log({ type: "adjust", component_id: row.id, qty: row.quantity, amount: 0, note: "Initial stock", source: "manual" });
  return row;
}

/** A quantity change made by editing is logged as an `adjust` transaction. */
export async function updateComponent(id: string, input: ComponentInput) {
  const row = findComponent(id);
  const next = cleanComponent(input, id);
  const delta = next.quantity - row.quantity;
  Object.assign(row, next);
  if (delta) log({ type: "adjust", component_id: id, qty: delta, amount: 0, note: "Edited quantity", source: "manual" });
  return row;
}

export async function deleteComponent(id: string) {
  findComponent(id);
  // Same rule the DB foreign key will enforce.
  if (db.transactions.some((t) => t.component_id === id))
    fail("Has transactions, so it can't be deleted. Set quantity to 0 instead.");
  db.components = db.components.filter((c) => c.id !== id);
}

// ---------- stock movements ----------
type Movement = { componentId: string; qty?: number; amount?: number; note?: string; source?: Transaction["source"] };

/** amount = total received; defaults to qty × sell_price. Rejects qty above stock. */
export async function recordSale({ componentId, qty, amount, note = "", source = "manual" }: Movement) {
  const c = findComponent(componentId);
  const n = posInt(qty, "Quantity");
  if (n > c.quantity) fail(`Only ${c.quantity} ${c.name} in stock`);
  const total = amount === undefined ? n * c.sell_price : nonNeg(amount, "Amount");
  c.quantity -= n;
  return log({ type: "sale", component_id: c.id, qty: n, amount: total, note, source });
}

/** amount = total paid (stored negative); defaults to qty × unit_cost. */
export async function recordPurchase({ componentId, qty, amount, note = "", source = "manual" }: Movement) {
  const c = findComponent(componentId);
  const n = posInt(qty, "Quantity");
  const total = amount === undefined ? n * c.unit_cost : nonNeg(amount, "Amount");
  c.quantity += n;
  return log({ type: "purchase", component_id: c.id, qty: n, amount: -total, note, source });
}

/** qty is a signed delta (e.g. -2 for damaged). No money moves. */
export async function adjustStock({ componentId, qty, note = "", source = "manual" }: Movement) {
  const c = findComponent(componentId);
  if (!qty || !Number.isInteger(qty)) fail("Adjustment must be a non-zero whole number");
  if (c.quantity + qty < 0) fail(`Only ${c.quantity} ${c.name} in stock`);
  c.quantity += qty;
  return log({ type: "adjust", component_id: c.id, qty, amount: 0, note, source });
}

// ---------- transactions & stats ----------
export type TxFilter = { from?: string; to?: string; type?: string; componentId?: string };

export async function getTransactions(f: TxFilter = {}): Promise<Transaction[]> {
  return db.transactions.filter((t) => {
    const d = day(t.created_at);
    return (!f.from || d >= f.from) && (!f.to || d <= f.to) && (!f.type || t.type === f.type) && (!f.componentId || t.component_id === f.componentId);
  });
}

export async function getStats() {
  const today = day(new Date().toISOString());
  const yesterday = day(new Date(Date.now() - 86_400_000).toISOString());
  const sales = db.transactions.filter((t) => t.type === "sale");
  const sum = (ts: Transaction[]) => ts.reduce((s, t) => s + t.amount, 0);
  const todaySales = sales.filter((t) => day(t.created_at) === today);

  // Top 5 components by quantity sold in the last 30 days.
  const since = Date.now() - 30 * 86_400_000;
  const sold = new Map<string, { qty: number; amount: number }>();
  for (const t of sales) {
    if (Date.parse(t.created_at) < since) continue;
    const s = sold.get(t.component_id) ?? { qty: 0, amount: 0 };
    sold.set(t.component_id, { qty: s.qty + t.qty, amount: s.amount + t.amount });
  }
  const names = new Map(db.components.map((c) => [c.id, c.name]));
  const topSelling = [...sold]
    .map(([id, s]) => ({ name: names.get(id) ?? "?", ...s }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    balance: sum(db.transactions),
    todayNet: sum(db.transactions.filter((t) => day(t.created_at) === today)),
    todaySales: sum(todaySales),
    todaySaleCount: todaySales.length,
    yesterdaySales: sum(sales.filter((t) => day(t.created_at) === yesterday)),
    lowStock: db.components.filter((c) => c.quantity < LOW_STOCK).sort((a, b) => a.quantity - b.quantity),
    topSelling,
  };
}

// ---------- requests ----------
export async function getRequests(): Promise<ComponentRequest[]> {
  return [...db.requests].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addRequest(input: { branch: string; section: string; mentor: string; message: string; file: File | null }) {
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
  const row: ComponentRequest = {
    id: newId(), branch, section, mentor, message,
    file_name: file?.name ?? null,
    status: "new", admin_note: "", created_at: new Date().toISOString(),
  };
  if (file) db.files.set(row.id, { name: file.name, type: file.type || "application/octet-stream", bytes: await file.arrayBuffer() });
  db.requests.push(row);
  return row;
}

export async function updateRequest(id: string, input: { status: string; admin_note: string }) {
  const row = db.requests.find((r) => r.id === id) ?? fail("Request not found");
  if (!REQUEST_STATUSES.includes(input.status as RequestStatus)) fail("Invalid status");
  row.status = input.status as RequestStatus;
  row.admin_note = input.admin_note.trim();
  return row;
}

export async function getRequestFile(id: string) {
  return db.files.get(id) ?? null;
}
