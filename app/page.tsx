import StarBorder from "@/components/reactbits/StarBorder";
import { Backdrop } from "./ui/Backdrop";
import { BlurText } from "./ui/BlurText";
import { GlowCard } from "./ui/GlowCard";
import { ParticleField } from "./ui/ParticleField";
import { PublicNav } from "./ui/PublicNav";

const STEPS = [
  ["Tell us what you need", "Type a list or attach a CSV, Excel sheet, Word doc, PDF or photo."],
  ["We check stock", "Every request lands with us straight away."],
  ["We get back to you", "Through your mentor, with what we can get and the price."],
];

export default function Home() {
  return (
    <div data-theme="dark" className="relative min-h-dvh overflow-x-clip">
      <Backdrop />
      <ParticleField />
      <PublicNav />

      <main className="mx-auto max-w-5xl px-4 pt-14 pb-20 sm:pt-24">
        <p className="rise chip mb-5" style={{ "--c": "var(--accent)" } as React.CSSProperties}>Electronic components, on request</p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
          <BlurText text="Can't find a part? We'll source it for you." />
        </h1>
        <p className="rise mt-5 max-w-xl text-base text-muted sm:text-lg" style={{ animationDelay: "500ms" }}>
          Send a quick message or drop in your parts sheet. We&apos;ll check our shelves and suppliers and reply with what we can get.
        </p>
        <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "650ms" }}>
          <StarBorder as="a" href="/request" color="#c4b5fd" trailColor="#7c3aed" radius={12} glow={0.8} sparkle backgroundColor="#120f1c" className="text-base">Request components →</StarBorder>
        </div>

        <div id="how" className="mt-20 grid scroll-mt-24 gap-4 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="rise" style={{ animationDelay: `${800 + i * 120}ms` }}>
              <GlowCard className="h-full bg-surface/70 backdrop-blur">
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                <h2 className="mt-2 font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </GlowCard>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
