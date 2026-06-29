import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import { cryptos, formatPrice } from "@/lib/paycrivo-data";
import { cn } from "@/lib/utils";

export function SupportedCrypto() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Supported cryptocurrencies</h2>
        <p className="mt-3 text-muted-foreground">Buy and swap 18+ leading digital assets on PayCrivo.</p>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cryptos.map((c) => {
          const up = c.change24h >= 0;
          return (
            <button
              key={c.symbol}
              className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft"
            >
              <CoinIcon symbol={c.symbol} color={c.color} size={36} />
              <div className="mt-3 text-sm font-bold text-foreground">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.symbol}</div>
              <div className="mt-2 flex w-full items-center justify-between">
                <span className="text-xs font-semibold text-foreground">${formatPrice(c.price)}</span>
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold", up ? "text-success" : "text-destructive")}>
                  {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(c.change24h).toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}