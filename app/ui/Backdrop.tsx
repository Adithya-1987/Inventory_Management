"use client";
import Grainient from "@/components/reactbits/Grainient";

// Full-screen moving grain gradient behind public pages. Fixed + inset-0 so it can never widen the page.
export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <Grainient colors={["#0a0910", "#160d2a", "#3b1a7a", "#7c3aed", "#c4b5fd"]} speed={0.4} grainAmount={0.07} interactive={false} dpr={1.25} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0910]/40 to-[#0a0910]" />
    </div>
  );
}
