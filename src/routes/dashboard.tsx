import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BadgeCheck, Bell, CheckCircle2, Clock, Gift, KeyRound,
  Receipt, Repeat, ShieldCheck, ShoppingCart, Wallet,
} from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import { loadDraft } from "@/lib/checkout";
import { loadExchangeDraft } from "@/lib/exchange";
import { loadWallets, type SavedWallet } from "@/lib/wallets";
import { getUserBuyOrders, getUserExchangeOrders } from "@/lib/userData";
import { getReward, REWARD_AMOUNT_USD, type Reward } from "@/lib/reward";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset } from "@/data/cryptoAssets";

const iconColor = (symbol: string) => getAsset(symbol)?.iconColor ?? "#8b5cf6";
const isDone = (s: string) => /complete|success|paid|sent|done/i.test(s);
const isPending = (s: string) => /pending|review|await|process|created|wait/i.test(s);

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PayCrivo" }] }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const rewardLabel: Record<Reward["status"], string> = {
  available: "Available",
  pending: "Pending wallet confirmation",
  claimed: "Claimed",
  expired: "Expired",
};

function Dashboard() {
  const { user, lastLogin } = useAuth();
  const [orders, setOrders] = useState<ReturnType<typeof getUserBuyOrders>>([]);
  const [exchangeOrders, setExchangeOrders] = useState<ReturnType<typeof getUserExchangeOrders>>([]);
  const [buyDraft, setBuyDraft] = useState<ReturnType<typeof loadDraft>>(null);
  const [exDraft, setExDraft] = useState<ReturnType<typeof loadExchangeDraft>>(null);
  const [wallets, setWallets] = useState<SavedWallet[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (!user) return;
    setOrders(getUserBuyOrders(user.id, user.email));
    setExchangeOrders(getUserExchangeOrders(user.id, user.email));
    setBuyDraft(loadDraft());
    setExDraft(loadExchangeDraft());
    setWallets(loadWallets(user.id));
    setReward(getReward(user.id));
  }, [user]);

  const stats = useMemo(() => {
    const all = [...orders, ...exchangeOrders];
    return {
      buy: orders.length,
      exchange: exchangeOrders.length,
      completed: all.filter((o) => isDone(o.status)).length,
      pending: all.filter((o) => isPending(o.status)).length,
      wallets: wallets.length,
    };
  }, [orders, exchangeOrders, wallets]);

  const timeline = useMemo(() => {
    const items: { icon: typeof Bell; label: string; when: string }[] = [];
    items.push({ icon: BadgeCheck, label: "Email verified", when: fmt(user?.createdAt) });
    if (reward?.status === "pending") items.push({ icon: Gift, label: "Welcome reward claim submitted", when: fmt(reward.claimedAt) });
    else if (reward?.status === "available") items.push({ icon: Gift, label: "$20 welcome reward available", when: fmt(user?.createdAt) });
    if (wallets[0]) items.push({ icon: Wallet, label: `Wallet saved · ${wallets[0].coin}`, when: fmt(wallets[0].createdAt) });
    const latest = [...orders, ...exchangeOrders][0];
    if (latest) items.push({ icon: Receipt, label: `Order created · ${latest.id}`, when: fmt(latest.createdAt) });
    return items.slice(0, 5);
  }, [user, reward, wallets, orders, exchangeOrders]);

  const actions = [
    { icon: ShoppingCart, label: "Buy crypto", to: "/buy-crypto" as const, search: {} },
    { icon: Repeat, label: "Exchange crypto", to: "/exchange" as const, search: {} },
    { icon: Receipt, label: "View orders", to: "/account/orders" as const, search: undefined },
    { icon: Wallet, label: "Add wallet", to: "/account/wallets" as const, search: undefined },
    { icon: Gift, label: "Claim reward", to: "/account/reward" as const, search: undefined },
  ];

  return (
    <PageChrome>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* Welcome hero */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {user?.firstName} 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
              <BadgeCheck className="size-4" /> Email verified
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Chip>Customer ID · {user?.id}</Chip>
            <Chip>Status · Active</Chip>
            <Chip>Preferred fiat · {user?.preferredFiat}</Chip>
            <Chip>Secure account access</Chip>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((a) => (
            <Link key={a.label} to={a.to} search={a.search as never}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><a.icon className="size-5" /></span>
              <span className="text-sm font-semibold text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Reward card */}
        {reward && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-primary/30 p-6 shadow-elegant sm:p-7"
            style={{ backgroundImage: "linear-gradient(135deg, #1a0f33, #2b1259 55%, #120a24)" }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-white"><Gift className="size-6" /></span>
                <div>
                  <p className="font-display text-lg font-bold text-white">
                    {reward.status === "available" ? `Your $${REWARD_AMOUNT_USD} welcome reward is available` : `$${REWARD_AMOUNT_USD} welcome reward`}
                  </p>
                  <p className="mt-0.5 text-sm text-white/70">Status: {rewardLabel[reward.status]}</p>
                </div>
              </div>
              {reward.status === "available" ? (
                <Link to="/account/reward" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#2b1259] hover:bg-white/90">
                  Claim reward <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link to="/account/reward" className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">
                  View status <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Drafts */}
        {(buyDraft || exDraft) && (
          <div className="mt-6 space-y-3">
            {buyDraft && <DraftCard title="Unfinished buy order" detail={`${buyDraft.spend} ${buyDraft.fiat} → ${buyDraft.coin}`} to="/buy" search={{ spend: buyDraft.spend, fiat: buyDraft.fiat, coin: buyDraft.coin, method: buyDraft.method }} />}
            {exDraft && <DraftCard title="Unfinished exchange" detail={`${exDraft.sendAmount} ${exDraft.sendCoin} → ${exDraft.receiveCoin}`} to="/exchange/checkout" search={{}} />}
          </div>
        )}

        {/* Activity preview stats */}
        <div className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Your activity</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Buy orders" value={stats.buy} />
            <Stat label="Exchanges" value={stats.exchange} />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Pending" value={stats.pending} />
            <Stat label="Saved wallets" value={stats.wallets} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Recent orders</h2>
            <div className="space-y-2">
              {orders.length === 0 && exchangeOrders.length === 0 && (
                <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No orders yet. Start by buying or exchanging crypto.</p>
              )}
              {orders.slice(0, 4).map((o) => (
                <Link key={o.id} to="/order/$orderId" params={{ orderId: o.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40">
                  <CryptoIcon symbol={o.coin} color={iconColor(o.coin)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Badge kind="buy" /> Buy {o.coin}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.id} · {o.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{o.spend} {o.fiat}</span>
                </Link>
              ))}
              {exchangeOrders.slice(0, 3).map((o) => (
                <Link key={o.id} to="/exchange/order/$orderId" params={{ orderId: o.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40">
                  <CryptoIcon symbol={o.receiveCoin} color={iconColor(o.receiveCoin)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Badge kind="exchange" /> {o.sendCoin} → {o.receiveCoin}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.id} · {o.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{o.sendAmount} {o.sendCoin}</span>
                </Link>
              ))}
            </div>

            {/* Activity timeline */}
            <h2 className="mb-3 mt-8 font-display text-lg font-bold text-foreground">Activity</h2>
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground"><t.icon className="size-4" /></span>
                  <span className="flex-1 text-sm font-medium text-foreground">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.when}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-3 font-display text-lg font-bold text-foreground">Saved wallets</h2>
              <div className="space-y-2">
                {wallets.length === 0 && (
                  <Link to="/account/wallets" className="block rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:border-primary/40">No wallets yet — add one →</Link>
                )}
                {wallets.slice(0, 4).map((w) => (
                  <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                    <CryptoIcon symbol={w.coin} color={iconColor(w.coin)} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{w.nickname || w.coin}</p>
                      <p className="truncate text-xs text-muted-foreground">{shorten(w.address)}</p>
                    </div>
                    {w.isDefault && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Default</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Security card */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-bold text-foreground">Security</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <SecRow icon={CheckCircle2} label="Email verified" ok />
                <SecRow icon={KeyRound} label="Password set" ok />
                <SecRow icon={ShieldCheck} label="Email code verification enabled" ok />
                <SecRow icon={Clock} label={`Last login · ${fmt(lastLogin)}`} />
              </ul>
              <Link to="/account/security" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Manage security <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PageChrome>
  );
}

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}
function shorten(a: string) {
  return a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold text-muted-foreground">{children}</span>;
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Badge({ kind }: { kind: "buy" | "exchange" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kind === "buy" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"}`}>
      {kind === "buy" ? "Buy" : "Exchange"}
    </span>
  );
}
function SecRow({ icon: Icon, label, ok }: { icon: typeof CheckCircle2; label: string; ok?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      <Icon className={`size-4 ${ok ? "text-success" : "text-muted-foreground"}`} /> {label}
    </li>
  );
}

function DraftCard({ title, detail, to, search }: { title: string; detail: string; to: string; search: Record<string, unknown> }) {
  return (
    <Link to={to as never} search={search as never} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-4 transition-colors hover:bg-accent">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">Resume <ArrowRight className="size-3.5" /></span>
    </Link>
  );
}
