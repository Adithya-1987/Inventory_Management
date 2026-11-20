"use client";
import { useEffect, useState } from "react";
import BellToggle from "@/components/reactbits/BellToggle";

// UI only for now: remembers the choice; real alerts arrive with the database (realtime) step.
export function NotifyBell({ count }: { count: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem("im-notify") === "1");
    } catch {}
  }, []);
  const change = (next: boolean) => {
    setOn(next);
    try {
      localStorage.setItem("im-notify", next ? "1" : "0");
    } catch {}
  };
  return (
    <BellToggle
      offLabel="Watch requests"
      onLabel="Watching requests"
      label="Watch new requests"
      pressed={on}
      onChange={change}
      count={count}
      size="sm"
      radius={10}
      color="var(--text)"
      background="var(--surface-2)"
      onColor="var(--accent-btn-fg)"
      onBackground="var(--accent-btn)"
      badgeColor="#ef4444"
    />
  );
}
