"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z",
};
const LINKS: [string, string, keyof typeof ICONS][] = [
  ["/admin", "Dashboard", "dashboard"],
  ["/admin/inventory", "Inventory", "box"],
  ["/admin/transactions", "Transactions", "list"],
  ["/admin/requests", "Requests", "inbox"],
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="grid grid-cols-4 gap-1 px-2 pb-2 md:flex md:flex-col md:px-3 md:pb-3">
      {LINKS.map(([href, label, icon]) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] transition-colors md:flex-row md:gap-2.5 md:px-3 md:py-2 md:text-sm ${
              active ? "bg-surface-2 text-fg md:shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <svg viewBox="0 0 24 24" className={`size-4 ${active ? "text-accent" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONS[icon]} />
            </svg>
            <span className="max-w-full truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
