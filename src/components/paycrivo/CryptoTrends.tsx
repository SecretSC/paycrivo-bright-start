import { ArrowDownRight, ArrowUpRight, Coins, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { orderedAssets, popularAssets, formatUsd, type CryptoAsset } from "@/data/cryptoAssets";
import { usePrices } from "@/services/priceService";
import { cn } from "@/lib/utils";

function CoinRow({ coin, price, change }: { coin: CryptoAsset; price: number; change: number }) {
  const up = change >= 0;
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
      <div className="flex min-w-0 items-center gap-3">
        <CryptoIcon symbol={coin.symbol} color={coin.iconColor} size={32} />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-foreground">{coin.name}</div>
          <div className="text-xs text-muted-foreground">{coin.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-foreground">${formatUsd(price)}</div>
        <div
          className={cn(
            "flex items-center justify-end gap-0.5 text-xs font-semibold",
            up ? "text-success" : "text-destructive",
          )}
        >
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(change).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  coins,
  accent,
  px,
  ch,
}: {
  title: string;
  icon: React.ReactNode;
  coins: CryptoAsset[];
  accent: string;
  px: (s: string, m: number) => number;
  ch: (s: string, m: number) => number;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("grid size-8 place-items-center rounded-lg", accent)}>{icon}</span>
        <h3 className="font-display font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-0.5">
        {coins.map((c) => (
          <CoinRow key={c.symbol} coin={c} price={px(c.symbol, c.mockPriceUsd)} change={ch(c.symbol, c.mockChange24h)} />
        ))}
      </div>
    </div>
  );
}

export function CryptoTrends() {
  const snap = usePrices();
  const px = (s: string, m: number) => snap.prices[s]?.price ?? m;
  const ch = (s: string, m: number) => snap.prices[s]?.change24h ?? m;
  const topMarketCap = orderedAssets.slice(0, 4);
  const gainers = [...orderedAssets].sort((a, b) => ch(b.symbol, b.mockChange24h) - ch(a.symbol, a.mockChange24h)).slice(0, 4);
  const losers = [...orderedAssets].sort((a, b) => ch(a.symbol, a.mockChange24h) - ch(b.symbol, b.mockChange24h)).slice(0, 4);
  const popular = popularAssets.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Crypto market trends</h2>
        <p className="mt-3 text-muted-foreground">Live movers across the market, updated around the clock.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Top Market Cap"
          icon={<Coins className="size-4 text-primary" />}
          coins={topMarketCap}
          accent="bg-accent"
          px={px}
          ch={ch}
        />
        <Card
          title="Top Gainers"
          icon={<TrendingUp className="size-4 text-success" />}
          coins={gainers}
          accent="bg-success/10"
          px={px}
          ch={ch}
        />
        <Card
          title="Top Losers"
          icon={<TrendingDown className="size-4 text-destructive" />}
          coins={losers}
          accent="bg-destructive/10"
          px={px}
          ch={ch}
        />
        <Card
          title="Most Popular"
          icon={<Flame className="size-4 text-primary" />}
          coins={popular}
          accent="bg-accent"
          px={px}
          ch={ch}
        />
      </div>
    </section>
  );
}
