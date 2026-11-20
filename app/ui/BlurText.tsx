// Words fade in from blur, staggered (React Bits Blur Text idea). Pure CSS, so it works before JS loads.
export function BlurText({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="blur-word" style={{ animationDelay: `${delay + i * 90}ms` }}>{w}</span>{" "}
        </span>
      ))}
    </span>
  );
}
