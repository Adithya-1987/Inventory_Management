"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteComponent, restock, saveComponent, sell } from "@/app/actions";
import { money } from "@/lib/format";
import { LOW_STOCK } from "@/lib/data";
import type { Component } from "@/lib/types";

function ComponentFields({ c }: { c?: Component | null }) {
  const field = (name: keyof Component, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`${name}-${c?.id ?? "new"}`}>{label}</label>
      <input id={`${name}-${c?.id ?? "new"}`} name={name} defaultValue={c ? String(c[name] ?? "") : ""} className="input" {...props} />
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
            placeholder={unit && unit > 0 ? `qty × ${money(unit)}` : "Enter amount (₹)"} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`note-${kind}-${c.id}`}>Note</label>
        <input id={`note-${kind}-${c.id}`} name="note" className="input" />
      </div>
    </>
  );
}

type DialogState =
  | { type: "add" }
  | { type: "edit"; comp: Component }
  | { type: "sell"; comp: Component }
  | { type: "restock"; comp: Component }
  | { type: "delete"; comp: Component }
  | null;

export function InventoryTable({
  initialComponents,
  initialQuery = "",
}: {
  initialComponents: Component[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [dialog, setDialog] = useState<DialogState>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Filter components in real-time (0ms latency)
  const q = query.trim().toLowerCase();
  const filtered = q
    ? initialComponents.filter((c) =>
        [c.name, c.category, c.location].some((f) => f.toLowerCase().includes(q))
      )
    : initialComponents;

  useEffect(() => {
    if (dialog && dialogRef.current) {
      if (!dialogRef.current.open) dialogRef.current.showModal();
    }
  }, [dialog]);

  const closeDialog = () => {
    dialogRef.current?.close();
    setDialog(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Inventory</h1>
        <button type="button" onClick={() => setDialog({ type: "add" })} className="btn">
          Add component
        </button>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="flex max-w-md gap-2">
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, category, location"
          className="input"
          aria-label="Search"
        />
        <button type="submit" className="btn-ghost">Search</button>
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
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="stack-full text-base font-medium md:text-sm">{c.name}</td>
                <td data-label="Category">{c.category}</td>
                <td data-label="Location">{c.location}</td>
                <td data-label="Qty" className={`text-right tabular-nums ${c.quantity < LOW_STOCK ? "font-medium text-warn" : ""}`}>{c.quantity}</td>
                <td data-label="Cost" className="text-right tabular-nums">{c.unit_cost && c.unit_cost > 0 ? money(c.unit_cost) : "-"}</td>
                <td data-label="Price" className="text-right tabular-nums">{c.sell_price && c.sell_price > 0 ? money(c.sell_price) : "-"}</td>
                <td className="stack-full max-md:pt-2">
                  <div className="flex flex-wrap justify-start gap-1.5 md:flex-nowrap md:justify-end">
                    <button type="button" onClick={() => setDialog({ type: "sell", comp: c })} className="btn">
                      Sell
                    </button>
                    <button type="button" onClick={() => setDialog({ type: "restock", comp: c })} className="btn-ghost">
                      Restock
                    </button>
                    <button type="button" onClick={() => setDialog({ type: "edit", comp: c })} className="btn-ghost">
                      Edit
                    </button>
                    <button type="button" onClick={() => setDialog({ type: "delete", comp: c })} className="btn-ghost">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="stack-full py-6 text-center text-muted">No components found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shared fast-mount modal */}
      {dialog && (
        <SharedModal
          ref={dialogRef}
          dialog={dialog}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

function SharedModal({
  dialog,
  onClose,
  ref,
}: {
  dialog: NonNullable<DialogState>;
  onClose: () => void;
  ref: React.RefObject<HTMLDialogElement | null>;
}) {
  const actionFn =
    dialog.type === "add" || dialog.type === "edit"
      ? saveComponent
      : dialog.type === "sell"
      ? sell
      : dialog.type === "restock"
      ? restock
      : deleteComponent;

  const [state, formAction, pending] = useActionState(actionFn, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const title =
    dialog.type === "add"
      ? "Add component"
      : dialog.type === "edit"
      ? `Edit ${dialog.comp.name}`
      : dialog.type === "sell"
      ? `Sell ${dialog.comp.name}`
      : dialog.type === "restock"
      ? `Restock ${dialog.comp.name}`
      : `Delete ${dialog.comp.name}?`;

  const submitLabel =
    dialog.type === "sell"
      ? "Record sale"
      : dialog.type === "restock"
      ? "Record purchase"
      : dialog.type === "delete"
      ? "Delete"
      : "Save";

  const isDanger = dialog.type === "delete";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto rounded-2xl p-0 shadow-2xl"
    >
      <form action={formAction} className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {dialog.type === "add" && <ComponentFields />}
        {dialog.type === "edit" && <ComponentFields c={dialog.comp} />}
        {dialog.type === "sell" && <MoveFields c={dialog.comp} kind="sell" />}
        {dialog.type === "restock" && <MoveFields c={dialog.comp} kind="restock" />}
        {dialog.type === "delete" && (
          <>
            <input type="hidden" name="id" value={dialog.comp.id} />
            <p className="text-sm text-muted">This can&apos;t be undone.</p>
          </>
        )}
        {state?.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className={isDanger ? "btn-danger" : "btn"} disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
