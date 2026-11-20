// Chip mark.
const PATH =
  "M20 14h24a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Zm6 12v12h12V26Z" +
  "M24 4h4v8h-4zM36 4h4v8h-4zM24 52h4v8h-4zM36 52h4v8h-4zM4 24h8v4H4zM4 36h8v4H4zM52 24h8v4h-8zM52 36h8v4h-8z";

export const LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill-rule="evenodd" d="${PATH}" fill="#fff"/></svg>`,
)}`;

export function Logo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path fillRule="evenodd" d={PATH} fill="currentColor" />
    </svg>
  );
}
