"use client";
import { useEffect, useState } from "react";
import DotGrid from "@/components/reactbits/DotGrid";
import LightRays from "@/components/reactbits/LightRays";

/** Quiet admin background: React Bits Dot Grid (dots light up near the cursor) + soft violet Light Rays from the top. */
export function AdminBackdrop() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setLight(root.dataset.theme === "light");
    read();
    const mo = new MutationObserver(read); // follow the theme toggle live
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <DotGrid
        dotSize={3}
        gap={22}
        baseColor={light ? "#dcd8e8" : "#24212e"}
        activeColor={light ? "#7c3aed" : "#a78bfa"}
        proximity={130}
        glow={0.4}
        shockRadius={260}
        shockStrength={3}
      />
      <div className="absolute inset-x-0 top-0 h-[70vh]">
        <LightRays
          raysOrigin="top-center"
          raysColor={light ? "#7c3aed" : "#a78bfa"}
          raysSpeed={0.6}
          lightSpread={0.8}
          rayLength={1.6}
          intensity={light ? 0.5 : 0.7}
          opacity={light ? 0.35 : 0.55}
          followMouse
          mouseInfluence={0.05}
          cursorShadow={false}
          clickPulse={false}
          lightMode={light}
        />
      </div>
    </div>
  );
}
