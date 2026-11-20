"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import * as data from "@/lib/data";
import type { ActionState } from "@/lib/types";

async function run(fn: () => Promise<unknown>): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Every admin write re-checks the session: server actions can be called directly, not only from admin pages. */
async function runAdmin(fn: () => Promise<unknown>): Promise<ActionState> {
  if (!(await getAdmin())) return { error: "Your session has ended. Log in again." };
  return run(fn);
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
/** undefined when blank, so data.ts can apply defaults. */
const num = (f: FormData, k: string) => (str(f, k) === "" ? undefined : Number(str(f, k)));

export async function saveComponent(_: ActionState, f: FormData) {
  const input = {
    name: str(f, "name"),
    category: str(f, "category"),
    location: str(f, "location"),
    quantity: num(f, "quantity") ?? 0,
    unit_cost: num(f, "unit_cost") ?? 0,
    sell_price: num(f, "sell_price") ?? 0,
  };
  const id = str(f, "id");
  return runAdmin(() => (id ? data.updateComponent(id, input) : data.addComponent(input)));
}

export async function deleteComponent(_: ActionState, f: FormData) {
  return runAdmin(() => data.deleteComponent(str(f, "id")));
}

export async function sell(_: ActionState, f: FormData) {
  return runAdmin(() => data.recordSale({ componentId: str(f, "id"), qty: num(f, "qty"), amount: num(f, "amount"), note: str(f, "note") }));
}

export async function restock(_: ActionState, f: FormData) {
  return runAdmin(() => data.recordPurchase({ componentId: str(f, "id"), qty: num(f, "qty"), amount: num(f, "amount"), note: str(f, "note") }));
}

/** Manual entry from the Transactions page: routes to the same stock functions as Sell/Restock. */
export async function addTransaction(_: ActionState, f: FormData) {
  const input = { componentId: str(f, "id"), qty: num(f, "qty"), amount: num(f, "amount"), note: str(f, "note") };
  const type = str(f, "type");
  return runAdmin(() =>
    type === "sale" ? data.recordSale(input)
    : type === "purchase" ? data.recordPurchase(input)
    : type === "adjust" ? data.adjustStock(input)
    : Promise.reject(new Error("Pick a type")),
  );
}

export async function submitRequest(_: ActionState, f: FormData) {
  const file = f.get("file");
  return run(() =>
    data.addRequest({
      branch: str(f, "branch"),
      section: str(f, "section"),
      mentor: str(f, "mentor"),
      message: str(f, "message"),
      file: file instanceof File ? file : null,
    }),
  );
}

export async function updateRequest(_: ActionState, f: FormData) {
  return runAdmin(() => data.updateRequest(str(f, "id"), { status: str(f, "status"), admin_note: str(f, "admin_note") }));
}

// ---------- auth ----------
export async function login(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(f, "email"), password: String(f.get("password") ?? "") });
  if (error) return { error: "Wrong email or password." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account is not an admin." };
  }
  redirect("/admin");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
