"use client";
import Link from "next/link";
import CardNav, { type CardNavItem } from "@/components/reactbits/CardNav";
import { Logo } from "./Logo";

const ITEMS: CardNavItem[] = [
  {
    label: "Request parts",
    description: "Send a list or upload a parts sheet. We reply with stock and price.",
    links: [
      { label: "New request", href: "/request" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    label: "What we stock",
    description: "ICs, passives, transistors, dev boards and modules.",
    links: [{ label: "Ask about a part", href: "/request" }],
  },
  {
    label: "Admin",
    description: "Inventory, sales and incoming requests.",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Dashboard", href: "/admin" },
    ],
  },
];

/** React Bits Card Nav, using Next's Link so navigation stays client-side. */
export function PublicNav() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4">
      <CardNav
        logo={<span className="flex items-center gap-2 text-base font-semibold"><Logo className="size-6 text-accent" /> Partsbin</span>}
        logoAlt="Partsbin home"
        logoHref="/"
        items={ITEMS}
        cta={{ label: "Request parts", href: "/request" }}
        accentColor="#a78bfa"
        linkComponent={Link}
        maxWidth={1024}
        cardHeight={150}
      />
    </div>
  );
}
