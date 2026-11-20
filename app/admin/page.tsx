import Link from "next/link";
import { getComponents, getRequests, getStats, getTransactions, LOW_STOCK } from "@/lib/data";
import { money, when } from "@/lib/format";
import { ActivityList, type ActivityItem } from "../ui/ActivityList";
import { CountUp } from "../ui/CountUp";
import { GlowCard } from "../ui/GlowCard";
import { NotifyBell } from "../ui/NotifyBell";
import { AgentChat } from "./AgentChat";

type Tone = "var(--success)" | "var(--danger)" | "var(--warn)" | "var(--muted)" | "var(--accent)";
const Chip = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span className="chip" style={{ "--c": tone } as React.CSSProperties}>{children}</span>
);

function Kpi({ label, children, foot }: { label: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <GlowCard className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      <span className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{children}</span>
      <span className="flex flex-wrap items-center gap-2 text-xs text-muted">{foot}</span>
    </GlowCard>
  );
}

export default async function Dashboard() {
  const [stats, recent, components, requests] = await Promise.all([getStats(), getTransactions(), getComponents(), getRequests()]);
  const name = new Map(components.map((c) => [c.id, c.name]));
  const newRequests = requests.filter((r) => r.status === "new").length;
  const out = stats.lowStock.filter((c) => c.quantity === 0).length;
  const vsYesterday = stats.yesterdaySales ? Math.round(((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100) : null;
  const maxQty = Math.max(1, ...stats.topSelling.map((t) => t.qty));

  const activity: ActivityItem[] = recent.slice(0, 6).map((t) => ({
    id: t.id,
    title: `${t.type[0].toUpperCase()}${t.type.slice(1)} · ${Math.abs(t.qty)} × ${name.get(t.component_id) ?? "?"}`,
    sub: when(t.created_at),
    amount: money(t.amount),
    tone: t.amount > 0 ? "pos" : t.amount < 0 ? "neg" : "zero",
  }));

  return (
    <div className="space-y-6">
      <header className="rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted">Stock, money and requests at a glance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NotifyBell count={newRequests} />
          <Link href="/admin/inventory" className="btn">+ Record sale</Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Balance" foot={<><Chip tone={stats.todayNet >= 0 ? "var(--success)" : "var(--danger)"}>{stats.todayNet >= 0 ? "+" : ""}{money(stats.todayNet)}</Chip> today</>}>
          <span className={stats.balance < 0 ? "text-danger" : ""}><CountUp value={stats.balance} kind="money" /></span>
        </Kpi>
        <Kpi
          label="Today's sales"
          foot={<>{vsYesterday === null ? <Chip tone="var(--muted)">no sales yesterday</Chip> : <Chip tone={vsYesterday >= 0 ? "var(--success)" : "var(--danger)"}>{vsYesterday >= 0 ? "↑" : "↓"} {Math.abs(vsYesterday)}%</Chip>} {vsYesterday !== null && "vs yesterday"} · {stats.todaySaleCount} sale(s)</>}
        >
          <CountUp value={stats.todaySales} kind="money" />
        </Kpi>
        <Kpi label="Low stock" foot={<>{out > 0 ? <Chip tone="var(--danger)">{out} out of stock</Chip> : <Chip tone="var(--muted)">none at 0</Chip>} under {LOW_STOCK}</>}>
          <span className={stats.lowStock.length ? "text-warn" : ""}><CountUp value={stats.lowStock.length} /></span>
        </Kpi>
        <Kpi label="New requests" foot={<Link href="/admin/requests" className="underline hover:text-fg">Open requests →</Link>}>
          <CountUp value={newRequests} />
        </Kpi>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <GlowCard className="min-w-0 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Top selling</h2>
            <span className="text-xs text-muted">last 30 days, by quantity</span>
          </div>
          {stats.topSelling.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.topSelling.map((t, i) => (
                <li key={t.name} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]">
                  <span className="truncate">{t.name}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="bar block h-full rounded-full"
                      style={{ width: `${(t.qty / maxQty) * 100}%`, background: "linear-gradient(90deg, color-mix(in oklab, var(--accent) 55%, transparent), var(--accent))", animationDelay: `${i * 80}ms` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-muted">{t.qty} · {money(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlowCard>

        <GlowCard className="min-w-0 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Low stock</h2>
            <Link href="/admin/inventory" className="text-xs text-muted underline hover:text-fg">Inventory →</Link>
          </div>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-muted">All good.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {stats.lowStock.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{c.name}<span className="ml-2 text-xs text-muted">{c.location}</span></span>
                  <Chip tone={c.quantity === 0 ? "var(--danger)" : "var(--warn)"}>{c.quantity} left</Chip>
                </li>
              ))}
            </ul>
          )}
        </GlowCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <GlowCard className="min-w-0 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link href="/admin/transactions" className="text-xs text-muted underline hover:text-fg">All transactions →</Link>
          </div>
          <ActivityList items={activity} />
        </GlowCard>
        <div className="min-w-0 lg:col-span-2">
          <AgentChat components={components.map((c) => c.name)} />
        </div>
      </section>
    </div>
  );
}
