import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Receipt, Repeat, ShoppingCart, Wallet } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";
import { loadDraft, type Order } from "@/lib/checkout";
import { loadExchangeDraft, type ExchangeOrder } from "@/lib/exchange";
import { loadWallets, type SavedWallet } from "@/lib/wallets";
import { CryptoIcon } from "@/components/CryptoIcon";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PayCrivo" }] }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [exchangeOrders, setExchangeOrders] = useState<ExchangeOrder[]>([]);
  const [buyDraft, setBuyDraft] = useState<ReturnType<typeof loadDraft>>(null);
  const [exDraft, setExDraft] = useState<ReturnType<typeof loadExchangeDraft>>(null);
  const [wallets, setWallets] = useState<SavedWallet[]>([]);

  useEffect(() => {
    try {
      setOrders(JSON.parse(localStorage.getItem("paycrivo-orders") ?? "[]"));
      setExchangeOrders(JSON.parse(localStorage.getItem("paycrivo_exchange_orders") ?? "[]"));
    } catch {
      /* ignore */
    }
    setBuyDraft(loadDraft());
    setExDraft(loadExchangeDraft());
    setWallets(loadWallets());
  }, []);

  const actions = [
    { icon: ShoppingCart, label: "Buy crypto", to: "/buy-crypto" as const, search: {} },
    { icon: Repeat, label: "Exchange crypto", to: "/exchange" as const, search: {} },
    { icon: Receipt, label: "View orders", to: "/account/orders" as const, search: undefined },
    { icon: Wallet, label: "Add wallet", to: "/account/wallets" as const, search: undefined },
  ];

  return (
    <PageChrome>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8" style={{ backgroundImage: "var(--gradient-hero)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Welcome back, {user?.firstName} 👋</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
              <BadgeCheck className="size-4" /> Email verified
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((a) => (
            <Link key={a.label} to={a.to} search={a.search as never}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><a.icon className="size-5" /></span>
              <span className="text-sm font-semibold text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>

        {(buyDraft || exDraft) && (
          <div className="mt-6 space-y-3">
            {buyDraft && (
              <DraftCard title="Unfinished buy order" detail={`${buyDraft.spend} ${buyDraft.fiat} → ${buyDraft.coin}`} to="/buy" search={{ spend: buyDraft.spend, fiat: buyDraft.fiat, coin: buyDraft.coin, method: buyDraft.method }} />
            )}
            {exDraft && (
              <DraftCard title="Unfinished exchange" detail={`${exDraft.sendAmount} ${exDraft.sendCoin} → ${exDraft.receiveCoin}`} to="/exchange/checkout" search={{}} />
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Recent orders</h2>
            <div className="space-y-2">
              {orders.length === 0 && exchangeOrders.length === 0 && (
                <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No orders yet. Start by buying or exchanging crypto.</p>
              )}
              {orders.slice(0, 4).map((o) => (
                <Link key={o.id} to="/order/$orderId" params={{ orderId: o.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40">
                  <CryptoIcon symbol={o.coin} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Buy {o.coin}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.id} · {o.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{o.spend} {o.fiat}</span>
                </Link>
              ))}
              {exchangeOrders.slice(0, 3).map((o) => (
                <Link key={o.id} to="/exchange/order/$orderId" params={{ orderId: o.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 hover:border-primary/40">
                  <CryptoIcon symbol={o.receiveCoin} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{o.sendCoin} → {o.receiveCoin}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.id} · {o.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{o.sendAmount} {o.sendCoin}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Saved wallets</h2>
            <div className="space-y-2">
              {wallets.length === 0 && (
                <Link to="/account/wallets" className="block rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground hover:border-primary/40">
                  No wallets yet — add one →
                </Link>
              )}
              {wallets.slice(0, 4).map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
                  <CryptoIcon symbol={w.coin} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{w.nickname || w.coin}</p>
                    <p className="truncate text-xs text-muted-foreground">{w.address}</p>
                  </div>
                  {w.isDefault && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Default</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account status</p>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-success"><BadgeCheck className="size-4" /> Active</p>
              <Link to="/account" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Manage account <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </PageChrome>
  );
}

function DraftCard({ title, detail, to, search }: { title: string; detail: string; to: string; search: Record<string, unknown> }) {
  return (
    <Link to={to as never} search={search as never}
      className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-4 transition-colors hover:bg-accent">
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">
        Resume <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}