"use client";
import Link from "next/link";
import { useActionState } from "react";
import { submitRequest } from "../actions";
import { Backdrop } from "../ui/Backdrop";
import { GlowCard } from "../ui/GlowCard";
import StarBorder from "@/components/reactbits/StarBorder";
import { ParticleField } from "../ui/ParticleField";
import { PublicNav } from "../ui/PublicNav";

const ACCEPT = ".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp";

export default function RequestPage() {
  const [state, action, pending] = useActionState(submitRequest, null);

  return (
    <div data-theme="dark" className="relative min-h-dvh overflow-x-clip">
      <Backdrop />
      <ParticleField />
      <PublicNav />
      <main className="mx-auto max-w-lg px-4 pt-10 pb-16">
        {state?.ok ? (
          <GlowCard className="rise bg-surface/80 p-8 text-center backdrop-blur">
            <div className="mx-auto grid size-12 place-items-center rounded-full text-success" style={{ background: "color-mix(in oklab, var(--success) 15%, transparent)" }}>✓</div>
            <h1 className="mt-4 text-2xl font-semibold">Request sent</h1>
            <p className="mt-2 text-muted">Thanks. We&apos;ll update your mentor on it.</p>
            <Link href="/" className="btn-ghost mt-6">Back home</Link>
          </GlowCard>
        ) : (
          <>
            <h1 className="rise text-3xl font-semibold tracking-tight">Request components</h1>
            <p className="rise mt-1 text-sm text-muted" style={{ animationDelay: "80ms" }}>Write what you need, attach a parts list, or both.</p>
            <div className="rise mt-6" style={{ animationDelay: "160ms" }}>
              <GlowCard className="bg-surface/80 p-5 backdrop-blur sm:p-6">
                <form action={action} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_6rem_1.4fr]">
                    <div>
                      <label className="label" htmlFor="branch">Branch</label>
                      <input id="branch" name="branch" required maxLength={50} className="input" placeholder="e.g. ECE" />
                    </div>
                    <div>
                      <label className="label" htmlFor="section">Section</label>
                      <input id="section" name="section" required maxLength={20} className="input" placeholder="e.g. A" />
                    </div>
                    <div>
                      <label className="label" htmlFor="mentor">Mentor</label>
                      <input id="mentor" name="mentor" required maxLength={100} className="input" placeholder="Mentor's name" />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="message">Message</label>
                    <textarea id="message" name="message" rows={5} maxLength={5000} className="input resize-y" placeholder="e.g. 20x LM358, 10x NE555" />
                  </div>
                  <div>
                    <label className="label" htmlFor="file">Parts sheet (optional)</label>
                    <input
                      id="file" name="file" type="file" accept={ACCEPT}
                      className="block w-full min-w-0 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-fg hover:file:brightness-125"
                    />
                    <p className="mt-1 text-xs text-muted">CSV, Excel, PDF or image, up to 5MB.</p>
                  </div>
                  {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
                  <StarBorder type="submit" disabled={pending} color="#c4b5fd" trailColor="#7c3aed" radius={10} glow={0.7} backgroundColor="#a78bfa" textColor="#0a0910" className="w-full py-2.5">{pending ? "Sending…" : "Send request"}</StarBorder>
                </form>
              </GlowCard>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
