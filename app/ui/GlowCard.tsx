"use client";
// Edge light + inner spotlight that follow the pointer (React Bits Magic Bento / Spotlight Card idea, CSS-driven).
export function GlowCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = e.currentTarget.style;
    s.setProperty("--x", `${e.clientX - r.left}px`);
    s.setProperty("--y", `${e.clientY - r.top}px`);
    s.setProperty("--glow", "1");
  };
  return (
    <div
      className={`glow-card card ${className}`}
      onPointerMove={move}
      onPointerLeave={(e) => e.currentTarget.style.setProperty("--glow", "0")}
    >
      {children}
    </div>
  );
}
