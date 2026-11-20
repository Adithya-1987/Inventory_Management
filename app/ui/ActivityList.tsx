"use client";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

export type ActivityItem = { id: string; title: string; sub: string; amount: string; tone: "pos" | "neg" | "zero" };

const TONE = { pos: "text-success", neg: "text-danger", zero: "text-muted" };

/** Rows stagger in on load; new rows slide in from the top (React Bits Animated List idea). */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <ul className="space-y-1.5">
        <AnimatePresence initial={true}>
          {items.map((it, i) => (
            <motion.li
              key={it.id}
              layout
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{it.title}</span>
                <span className="block text-xs text-muted">{it.sub}</span>
              </span>
              <span className={`shrink-0 text-sm font-medium tabular-nums ${TONE[it.tone]}`}>{it.amount}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  );
}
