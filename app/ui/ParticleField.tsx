import Particles from "@/components/reactbits/Particles";

// React Bits Particles over the public pages' gradient. Fixed + inset-0, so it never widens the page.
export function ParticleField() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <Particles
        particleColors={["#ffffff", "#c4b5fd", "#a78bfa"]}
        particleCount={220}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        glow={0.5}
        twinkle={0.3}
        moveParticlesOnHover
        hoverEffect="parallax"
        clickBurst
      />
    </div>
  );
}
