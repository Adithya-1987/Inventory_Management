import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { Backdrop } from "../ui/Backdrop";
import { GlowCard } from "../ui/GlowCard";
import { Logo } from "../ui/Logo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div data-theme="dark" className="relative grid min-h-dvh place-items-center overflow-x-clip px-4 py-10">
      <Backdrop />
      <div className="rise w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold"><Logo className="size-7 text-accent" /> Inventory</Link>
        <GlowCard className="bg-surface/80 p-6 backdrop-blur">
          <h1 className="text-xl font-semibold">Admin login</h1>
          <LoginForm />
        </GlowCard>
        <Link href="/" className="mt-4 block text-center text-sm text-muted underline hover:text-fg">← Back to site</Link>
      </div>
    </div>
  );
}
