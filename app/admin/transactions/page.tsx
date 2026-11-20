import Link from "next/link";
import { addTransaction } from "@/app/actions";
import { ActionDialog } from "@/app/ui/ActionDialog";
import { getComponents, getTransactions, type TxFilter } from "@/lib/data";
import { money, when } from "@/lib/format";
import { TX_TYPES } from "@/lib/types";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TxFilter> }) {
  const filter = await searchParams;
  const [txs, components] = await Promise.all([getTransactions(filter), getComponents()]);
  const name = new Map(components.map((c) => [c.id, c.name]));
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const query = new URLSearchParams(Object.entries(filter).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Transactions</h1>
        <div className="flex flex-wrap gap-2">
          <a href={`/admin/transactions/export?${query}`} className="btn-ghost">Export CSV</a>
          <ActionDialog label="+ Add transaction" title="Add transaction" action={addTransaction} submit="Add" buttonClass="btn">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="tx-type">Type</label>
                <select id="tx-type" name="type" required className="input capitalize" defaultValue="sale">
                  {TX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tx-comp">Component</label>
                <select id="tx-comp" name="id" required className="input" defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {components.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.quantity})</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tx-qty">Quantity</label>
                <input id="tx-qty" name="qty" type="number" step={1} required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="tx-amt">Total (₹)</label>
                <input id="tx-amt" name="amount" type="number" min={0} step="0.01" className="input" placeholder="default price" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="tx-note">Note</label>
              <input id="tx-note" name="note" maxLength={500} className="input" />
            </div>
            <p className="text-xs text-muted">Sale adds money and removes stock. Purchase spends money and adds stock. Adjust changes stock only; use a negative quantity to remove (e.g. -2 damaged).</p>
          </ActionDialog>
        </div>
      </div>

      <form className="card grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={filter.from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={filter.to} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={filter.type ?? ""} className="input">
            <option value="">All</option>
            {TX_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="componentId">Component</label>
          <select id="componentId" name="componentId" defaultValue={filter.componentId ?? ""} className="input">
            <option value="">All</option>
            {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button className="btn">Filter</button>
        <Link href="/admin/transactions" className="btn-ghost">Clear</Link>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr>
              <th>When</th><th>Type</th><th>Component</th><th className="text-right">Qty</th>
              <th className="text-right">Amount</th><th>Note</th><th>Source</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => (
              <tr key={t.id}>
                <td data-label="When" className="whitespace-nowrap">{when(t.created_at)}</td>
                <td data-label="Type" className="capitalize">{t.type}</td>
                <td data-label="Component">{name.get(t.component_id) ?? "?"}</td>
                <td data-label="Qty" className="text-right tabular-nums">{t.qty}</td>
                <td data-label="Amount" className={`text-right tabular-nums ${t.amount < 0 ? "text-danger" : ""}`}>{money(t.amount)}</td>
                <td data-label="Note" className="text-muted">{t.note}</td>
                <td data-label="Source" className="text-muted">{t.source}</td>
              </tr>
            ))}
            {txs.length === 0 && (
              <tr><td colSpan={7} className="stack-full py-6 text-center text-muted">No transactions match.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="font-medium">Net ({txs.length})</td>
              <td className={`text-right font-medium tabular-nums ${total < 0 ? "text-danger" : ""}`}>{money(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
