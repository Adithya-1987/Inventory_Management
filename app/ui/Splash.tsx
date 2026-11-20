"use client";
import { useEffect, useState } from "react";
import LightTunnel from "@/components/reactbits/LightTunnel";
import { DecryptedText } from "./DecryptedText";
import { Logo } from "./Logo";

type Phase = "idle" | "run" | "fade" | "gone";

/**
 * Loading screen on every full page load (not on in-app navigation): fibre-optic light tunnel with the logo at its centre.
 * Server renders a static cover so the page never flashes before it.
 */
export function Splash() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    setPhase("run");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fade = setTimeout(() => setPhase("fade"), reduce ? 400 : 1800);
    const gone = setTimeout(() => setPhase("gone"), reduce ? 500 : 2400); // unmount WebGL after fade-out
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div id="splash" data-theme="dark" data-done={phase === "fade" ? "" : undefined} role="status" aria-label="Loading" className="fixed inset-0 z-[100] bg-bg">
      {phase !== "idle" && (
        <LightTunnel
          className="absolute inset-0"
          cableColor="#a78bfa"
          pulseColor="#ddd6fe"
          tunnelColor="#7c3aed"
          tunnelOpacity={0.15}
          cableCount={64}
          pulseDensity={0.6}
          pulseSpeed={2.5}
          flowDirection="inward"
          mouseInteraction={false}
          clickSurge={false}
        />
      )}
      <div className="absolute inset-0 grid place-items-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-20 place-items-center rounded-2xl border border-line bg-bg/70 backdrop-blur" style={{ boxShadow: "0 0 60px -10px var(--accent)" }}>
            <Logo className="size-10 text-accent" />
          </div>
          <DecryptedText text="LOADING INVENTORY" run={phase !== "idle"} className="text-xs tracking-[0.3em] text-muted" />
        </div>
      </div>
    </div>
  );
}
