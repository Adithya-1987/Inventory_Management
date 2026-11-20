"use client";
import { useEffect, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/";

/** Scrambles then resolves left to right (React Bits Decrypted Text idea). Monospace so width never jumps. */
export function DecryptedText({ text, run, className = "" }: { text: string; run: boolean; className?: string }) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (!run) return;
    let revealed = 0;
    const id = setInterval(() => {
      revealed += 0.4;
      setOut([...text].map((ch, k) => (k < revealed || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(""));
      if (revealed >= text.length) clearInterval(id);
    }, 35);
    return () => clearInterval(id);
  }, [run, text]);

  return (
    <span className={`font-mono whitespace-pre ${className}`} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}
