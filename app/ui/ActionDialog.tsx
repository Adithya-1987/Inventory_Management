"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/types";

/** Button that opens a native <dialog> with a server-action form. Lazy-mounts the modal contents on click for extreme DOM performance. */
export function ActionDialog({
  label,
  title,
  action,
  children,
  submit = "Save",
  buttonClass = "btn-ghost",
  danger = false,
}: {
  label: string;
  title: string;
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  buttonClass?: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      setOpen(false);
    }
  }, [state]);

  const handleOpen = () => {
    setOpen(true);
  };

  useEffect(() => {
    if (open && ref.current && !ref.current.open) {
      ref.current.showModal();
    }
  }, [open]);

  const handleClose = () => {
    ref.current?.close();
    setOpen(false);
  };

  return (
    <>
      <button type="button" className={buttonClass} onClick={handleOpen}>
        {label}
      </button>
      {open && (
        <dialog
          ref={ref}
          onClose={handleClose}
          className="m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto rounded-2xl p-0 shadow-2xl"
        >
          <form action={formAction} className="space-y-3 p-5">
            <h2 className="text-lg font-semibold">{title}</h2>
            {children}
            {state?.error && (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={handleClose}>
                Cancel
              </button>
              <button className={danger ? "btn-danger" : "btn"} disabled={pending}>
                {pending ? "Saving…" : submit}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
