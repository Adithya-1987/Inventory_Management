import { deleteComponent, restock, saveComponent, sell } from "@/app/actions";
import { ActionDialog } from "@/app/ui/ActionDialog";
import { getComponents, LOW_STOCK } from "@/lib/data";
import { money } from "@/lib/format";
import type { Component } from "@/lib/types";

function ComponentFields({ c }: { c?: Component }) {
  const field = (name: keyof Component, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`${name}-${c?.id ?? "new"}`}>{label}</label>
      <input id={`${name}-${c?.id ?? "new"}`} name={name} defaultValue={c?.[name]} className="input" {...props} />
    </div>
  );
  const price = { type: "number", min: 0, step: "0.01", required: true };
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      {field("name", "Name", { required: true })}
      <div className="grid grid-cols-2 gap-3">
        {field("category", "Category")}
        {field("location", "Location")}
        {field("quantity", "Quantity", { type: "number", min: 0, step: 1, required: true })}
        {field("unit_cost", "Unit cost (₹)", price)}
        {field("sell_price", "Sell price (₹)", price)}
      </div>
    </>
  );
}

function MoveFields({ c, kind }: { c: Component; kind: "sell" | "restock" }) {
  const unit = kind === "sell" ? c.sell_price : c.unit_cost;
  return (
    <>
      <input type="hidden" name="id" value={c.id} />
      <p className="text-sm text-muted">In stock: {c.quantity}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`qty-${kind}-${c.id}`}>Quantity</label>
          <input id={`qty-${kind}-${c.id}`} name="qty" type="number" min={1} step={1} required className="input"
            max={kind === "sell" ? c.quantity : undefined} />
        </div>
        <div>
          <label className="label" htmlFor={`amt-${kind}-${c.id}`}>{kind === "sell" ? "Total received (₹)" : "Total paid (₹)"}</label>
          <input id={`amt-${kind}-${c.id}`} name="amount" type="number" min={0} step="0.01" className="input"
            placeholder={`qty × ${money(unit)}`} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`note-${kind}-${c.id}`}>Note</label>
        <input id={`note-${kind}-${c.id}`} name="note" className="input" />
      </div>
    </>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const components = await getComponents(q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Inventory</h1>
        <ActionDialog label="Add component" title="Add component" action={saveComponent} buttonClass="btn">
          <ComponentFields />
        </ActionDialog>
      </div>

      <form className="flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, category, location" className="input" aria-label="Search" />
        <button className="btn-ghost">Search</button>
      </form>

      <div className="card overflow-x-auto p-0">
        <table className="table table-stack">
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th>Location</th>
              <th className="text-right">Qty</th><th className="text-right">Cost</th><th className="text-right">Price</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id}>
                <td className="stack-full text-base font-medium md:text-sm">{c.name}</td>
                <td data-label="Category">{c.category}</td>
                <td data-label="Location">{c.location}</td>
                <td data-label="Qty" className={`text-right tabular-nums ${c.quantity < LOW_STOCK ? "font-medium text-warn" : ""}`}>{c.quantity}</td>
                <td data-label="Cost" className="text-right tabular-nums">{money(c.unit_cost)}</td>
                <td data-label="Price" className="text-right tabular-nums">{money(c.sell_price)}</td>
                <td className="stack-full max-md:pt-2">
                  <div className="flex flex-wrap justify-start gap-1.5 md:flex-nowrap md:justify-end">
                    <ActionDialog label="Sell" title={`Sell ${c.name}`} action={sell} submit="Record sale" buttonClass="btn">
                      <MoveFields c={c} kind="sell" />
                    </ActionDialog>
                    <ActionDialog label="Restock" title={`Restock ${c.name}`} action={restock} submit="Record purchase">
                      <MoveFields c={c} kind="restock" />
                    </ActionDialog>
                    <ActionDialog label="Edit" title={`Edit ${c.name}`} action={saveComponent}>
                      <ComponentFields c={c} />
                    </ActionDialog>
                    <ActionDialog label="Delete" title={`Delete ${c.name}?`} action={deleteComponent} submit="Delete" danger>
                      <input type="hidden" name="id" value={c.id} />
                      <p className="text-sm text-muted">This can&apos;t be undone.</p>
                    </ActionDialog>
                  </div>
                </td>
              </tr>
            ))}
            {components.length === 0 && (
              <tr><td colSpan={7} className="stack-full py-6 text-center text-muted">No components found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
