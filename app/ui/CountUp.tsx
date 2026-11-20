"use client";
import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { money } from "@/lib/format";

const FORMAT = { money, int: (n: number) => Math.round(n).toLocaleString("en-IN") };

/** Counts from the last shown value to `value`. Screen readers get the final value only. */
export function CountUp({ value, kind = "int" }: { value: number; kind?: keyof typeof FORMAT }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = FORMAT[kind];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = f(value);
      shown.current = value;
      return;
    }
    const c = animate(shown.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = f(kind === "int" ? Math.round(v) : Math.round(v * 100) / 100)),
      onComplete: () => (shown.current = value),
    });
    return () => c.stop();
  }, [value, kind]);

  return (
    <span className="tabular-nums">
      <span className="sr-only">{FORMAT[kind](value)}</span>
      <span ref={ref} aria-hidden="true">{FORMAT[kind](0)}</span>
    </span>
  );
}
