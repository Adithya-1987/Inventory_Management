"use client";
import { ChipIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import PromptBar, { type PromptBarSource } from "@/components/reactbits/PromptBar";
import ThoughtLine from "@/components/reactbits/ThoughtLine";
import { GlowCard } from "../ui/GlowCard";

const COMMANDS = [
  { key: "sell", name: "/sell", description: "Record a sale" },
  { key: "restock", name: "/restock", description: "Record a purchase" },
  { key: "stock", name: "/stock", description: "Check what's left" },
  { key: "requests", name: "/requests", description: "List new requests" },
];
const STEPS = ["Reading your message", "Matching components", "Agent not connected yet"];

type Turn = { id: number; text: string; reply?: string };

/** Agent UI shell: real input (React Bits Prompt Bar) and thinking line, no model yet (agent step). */
export function AgentChat({ components }: { components: string[] }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const sources: PromptBarSource[] = components.map((name) => ({ key: name, name, icon: ChipIcon }));
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, step]);

  const finish = (id: number, reply: string) => {
    clear();
    setBusy(false);
    setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply } : x)));
  };
  const send = (text: string) => {
    const id = Date.now();
    setTurns((t) => [...t, { id, text }]);
    setBusy(true);
    setStep(1);
    timers.current.push(
      window.setTimeout(() => setStep(2), 600),
      window.setTimeout(() => setStep(3), 1200),
      window.setTimeout(() => finish(id, "I'm not connected yet. In the agent step I'll turn this into an action and ask you to confirm before anything changes."), 1800),
    );
  };

  return (
    <GlowCard className="flex h-full min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Agent</h2>
        <span className="chip" style={{ "--c": "var(--warn)" } as React.CSSProperties}>Preview</span>
      </div>

      <div ref={listRef} className="max-h-72 min-h-32 flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        {turns.length === 0 && (
          <p className="text-muted">
            Try <code className="font-mono text-fg">sold 5 LM358 for 200</code>. Type <code className="font-mono text-fg">@</code> for components, <code className="font-mono text-fg">/</code> for commands.
          </p>
        )}
        {turns.map((t, i) => {
          const live = i === turns.length - 1;
          return (
            <div key={t.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 break-words" style={{ background: "var(--accent-btn)", color: "var(--accent-btn-fg)" }}>
                {t.text}
              </p>
              <ThoughtLine
                working={live && busy}
                steps={live && busy ? STEPS.slice(0, step) : STEPS}
                label="Thinking…"
                fontSize={13}
                color="var(--muted)"
                glyphColor="var(--accent)"
              />
              {t.reply && <p className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-surface-2 px-3 py-2">{t.reply}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <PromptBar
          placeholder='e.g. "restock 20 NE555 for 150"'
          sources={sources}
          commands={COMMANDS}
          models={[]}
          efforts={[]}
          busy={busy}
          onSend={send}
          onStop={() => {
            const last = turns[turns.length - 1];
            if (last) finish(last.id, "Stopped.");
          }}
          width={2000}
          radius={14}
          background="var(--surface-2)"
          color="var(--text)"
          menuBackground="var(--surface)"
        />
      </div>
    </GlowCard>
  );
}
