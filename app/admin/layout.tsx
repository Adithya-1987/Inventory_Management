import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";
import { AdminBackdrop } from "../ui/AdminBackdrop";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AdminNav } from "./AdminNav";

// In-memory data changes at runtime; never prerender admin pages.
export const dynamic = "force-dynamic";

// Only users listed in public.admins get past requireAdmin(); everyone else is sent to /login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminBackdrop />
      <aside className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 md:py-5">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <Logo className="size-6 text-accent" /> Partsbin
          </Link>
          <ThemeToggle />
        </div>
        <AdminNav />
        <div className="hidden px-3 pb-4 md:absolute md:inset-x-0 md:bottom-0 md:block">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="truncate text-xs text-muted" title={user.email}>{user.email}</p>
            <form action={logout} className="mt-2">
              <button className="btn-ghost w-full">Log out</button>
            </form>
          </div>
        </div>
        <form action={logout} className="absolute top-3 right-14 md:hidden">
          <button className="btn-ghost h-8 px-2 text-xs" aria-label={`Log out ${user.email ?? ""}`}>Log out</button>
        </form>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
