import { requireAdmin } from "@/lib/auth";
import { getComponents, getTransactions } from "@/lib/data";

export const dynamic = "force-dynamic";

// Quote every field; neutralise leading =+-@ so spreadsheets don't run notes as formulas.
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return `"${(/^[=+\-@]/.test(s) && isNaN(Number(s)) ? "'" + s : s).replaceAll('"', '""')}"`;
};

export async function GET(req: Request) {
  await requireAdmin();
  const p = new URL(req.url).searchParams;
  const filter = { from: p.get("from") ?? "", to: p.get("to") ?? "", type: p.get("type") ?? "", componentId: p.get("componentId") ?? "" };
  const [txs, components] = await Promise.all([getTransactions(filter), getComponents()]);
  const name = new Map(components.map((c) => [c.id, c.name]));

  const rows = [
    ["created_at", "type", "component", "qty", "amount", "note", "source"],
    ...txs.map((t) => [t.created_at, t.type, name.get(t.component_id) ?? "", t.qty, t.amount, t.note, t.source]),
  ];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
