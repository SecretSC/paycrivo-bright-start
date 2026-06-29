import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset } from "@/data/cryptoAssets";
import { useAuth } from "@/lib/auth";
import { getUserBuyOrders, getUserExchangeOrders } from "@/lib/userData";

export const Route = createFileRoute("/account/orders")({
  component: OrdersPage,
});

type Row =
  | { kind: "buy"; id: string; status: string; coin: string; primary: string; createdAt: string }
  | { kind: "exchange"; id: string; status: string; coin: string; primary: string; createdAt: string };

function OrdersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"all" | "buy" | "exchange">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    try {
      const buys = getUserBuyOrders(user.id, user.email);
      const ex = getUserExchangeOrders(user.id, user.email);
      const all: Row[] = [
        ...buys.map((o) => ({ kind: "buy" as const, id: o.id, status: o.status, coin: o.coin, primary: `${o.spend} ${o.fiat} → ${o.coin}`, createdAt: o.createdAt })),
        ...ex.map((o) => ({ kind: "exchange" as const, id: o.id, status: o.status, coin: o.receiveCoin, primary: `${o.sendAmount} ${o.sendCoin} → ${o.receiveCoin}`, createdAt: o.createdAt })),
      ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setRows(all);
    } catch {
      /* ignore */
    }
  }, [user]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return rows.filter((r) => (tab === "all" || r.kind === tab) && (!q || r.id.toUpperCase().includes(q)));
  }, [rows, tab, query]);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <h2 className="font-display text-lg font-bold text-foreground">Orders</h2>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {(["all", "buy", "exchange"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by order ID"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No orders found.</p>}
        {filtered.map((r) => (
          <Link key={r.id}
            to={r.kind === "buy" ? "/order/$orderId" : "/exchange/order/$orderId"}
            params={{ orderId: r.id }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/40">
            <CryptoIcon symbol={r.coin} color={getAsset(r.coin)?.iconColor ?? "#8b5cf6"} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{r.primary}</p>
              <p className="truncate text-xs text-muted-foreground">{r.id} · {r.kind === "buy" ? "Buy" : "Exchange"}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">{r.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}