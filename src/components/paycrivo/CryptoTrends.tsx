import { ArrowDownRight, ArrowUpRight, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import { cryptos, formatPrice, type Coin } from "@/lib/paycrivo-data";
import { cn } from "@/lib/utils";

function CoinRow({ coin }: { coin: Coin }) {
  const up = coin.change24h >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
      <div className="flex min-w-0 items-center gap-3">
        <CoinIcon symbol={coin.symbol} color={coin.color} size={32} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-foreground">{coin.name}</div>
          <div className="text-xs text-muted-foreground">{coin.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-foreground">${formatPrice(coin.price)}</div>
        <div className={cn("flex items-center justify-end gap-0.5 text-xs font-semibold", up ? "text-success" : "text-destructive")}>
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(coin.change24h).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, coins, accent }: { title: string; icon: React.ReactNode; coins: Coin[]; accent: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("grid size-8 place-items-center rounded-lg", accent)}>{icon}</span>
        <h3 className="font-display font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-0.5">
        {coins.map((c) => (
          <CoinRow key={c.symbol} coin={c} />
        ))}
      </div>
    </div>
  );
}

export function CryptoTrends() {
  const gainers = [...cryptos].sort((a, b) => b.change24h - a.change24h).slice(0, 4);
  const losers = [...cryptos].sort((a, b) => a.change24h - b.change24h).slice(0, 4);
  const popular = cryptos.filter((c) => ["BTC", "ETH", "SOL", "XRP"].includes(c.symbol));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Crypto market trends</h2>
        <p className="mt-3 text-muted-foreground">Live movers across the market, updated around the clock.</p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Card title="Top Gainers" icon={<TrendingUp className="size-4 text-success" />} coins={gainers} accent="bg-success/10" />
        <Card title="Top Losers" icon={<TrendingDown className="size-4 text-destructive" />} coins={losers} accent="bg-destructive/10" />
        <Card title="Most Popular" icon={<Flame className="size-4 text-primary" />} coins={popular} accent="bg-accent" />
      </div>
    </section>
  );
}