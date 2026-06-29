import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Repeat, Search, TrendingDown, TrendingUp } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { CryptoIcon } from "@/components/CryptoIcon";
import { cryptoAssets, getAsset, type CryptoAsset } from "@/data/cryptoAssets";
import { usePrices } from "@/services/priceService";
import { formatPrice } from "@/lib/paycrivo-data";
import {
  defaultExchange,
  networksForAsset,
  saveExchangeDraft,
} from "@/lib/exchange";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prices")({
  head: () => ({
    meta: [
      { title: "Crypto Prices — Live Rates | PayCrivo" },
      {
        name: "description",
        content:
          "Track live prices for Bitcoin, Ethereum, Solana and more. Transparent, indicative rates before you buy or swap with PayCrivo.",
      },
      { property: "og:title", content: "Crypto prices — PayCrivo" },
      {
        property: "og:description",
        content: "Track popular crypto assets with transparent rates before you buy or swap.",
      },
    ],
  }),
  component: PricesPage,
});

// Curated set of major, well-known assets shown on the prices board.
const BOARD_SYMBOLS = [
  "BTC", "ETH", "SOL", "USDT", "USDC", "XRP", "LTC", "TRX", "BNB", "ADA",
  "DOGE", "XMR", "BCH", "XLM", "DOT", "AVAX", "LINK", "POL", "TON", "UNI",
];

const PAYMENT_SYMBOLS = new Set(["BTC", "LTC", "XRP", "TRX", "BCH", "XLM", "DOGE", "USDT", "USDC"]);

type TabId = "popular" | "stablecoins" | "layer1" | "payments" | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "stablecoins", label: "Stablecoins" },
  { id: "layer1", label: "Layer 1" },
  { id: "payments", label: "Payments" },
  { id: "all", label: "All" },
];

function matchesTab(a: CryptoAsset, tab: TabId): boolean {
  switch (tab) {
    case "popular":
      return a.isPopular;
    case "stablecoins":
      return a.isStablecoin;
    case "layer1":
      return a.category === "Layer 1";
    case "payments":
      return PAYMENT_SYMBOLS.has(a.symbol);
    case "all":
    default:
      return true;
  }
}

function PricesPage() {
  const navigate = useNavigate();
  const snap = usePrices();
  const [tab, setTab] = useState<TabId>("popular");
  const [query, setQuery] = useState("");

  const board = useMemo(
    () => BOARD_SYMBOLS.map((s) => getAsset(s)).filter((a): a is CryptoAsset => Boolean(a)),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.filter((a) => {
      if (!matchesTab(a, tab)) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q);
    });
  }, [board, tab, query]);

  function goBuy(symbol: string) {
    navigate({ to: "/buy", search: { spend: "500", fiat: "USD", coin: symbol, method: "card" } });
  }

  function goSwap(symbol: string) {
    const isSol = symbol === "SOL";
    const sendCoin = isSol ? "BTC" : "SOL";
    saveExchangeDraft({
      ...defaultExchange,
      step: 0,
      sendCoin,
      sendNetwork: networksForAsset(sendCoin)[0],
      receiveCoin: symbol,
      receiveNetwork: networksForAsset(symbol)[0],
    });
    navigate({ to: "/exchange/checkout" });
  }

  const priceOf = (symbol: string) => snap.prices[symbol]?.price ?? getAsset(symbol)?.mockPriceUsd ?? 0;
  const changeOf = (symbol: string) => snap.prices[symbol]?.change24h ?? getAsset(symbol)?.mockChange24h ?? 0;

  return (
    <PageChrome>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="size-2 rounded-full bg-success" /> Live market rates
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl">
              Crypto <span className="text-gradient">prices</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Track popular crypto assets with transparent rates before you buy or swap.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          {/* Controls */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    tab === t.id
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "border border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search asset or ticker…"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Network</th>
                  <th className="px-5 py-4 text-right">Price</th>
                  <th className="px-5 py-4 text-right">24h</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const change = changeOf(a.symbol);
                  const up = change >= 0;
                  return (
                    <tr key={a.symbol} className="border-b border-border/60 last:border-0 transition-colors hover:bg-secondary/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={a.symbol} color={a.iconColor} size={36} />
                          <div>
                            <p className="text-sm font-bold text-foreground">{a.name}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{a.symbol}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                          {a.supportedNetworks[0]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-foreground">
                        ${formatPrice(priceOf(a.symbol))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn("inline-flex items-center justify-end gap-1 text-sm font-bold", up ? "text-success" : "text-destructive")}>
                          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                          {up ? "+" : ""}{change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => goBuy(a.symbol)}
                            className="bg-gradient-primary rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => goSwap(a.symbol)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                          >
                            <Repeat className="size-3.5" /> Swap
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((a) => {
              const change = changeOf(a.symbol);
              const up = change >= 0;
              return (
                <div key={a.symbol} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CryptoIcon symbol={a.symbol} color={a.iconColor} size={38} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{a.name}</p>
                        <p className="text-xs font-semibold text-muted-foreground">{a.symbol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">${formatPrice(priceOf(a.symbol))}</p>
                      <span className={cn("inline-flex items-center justify-end gap-1 text-xs font-bold", up ? "text-success" : "text-destructive")}>
                        {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {up ? "+" : ""}{change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="truncate rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {a.supportedNetworks[0]}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => goBuy(a.symbol)}
                        className="bg-gradient-primary rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground shadow-soft"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => goSwap(a.symbol)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground"
                      >
                        <Repeat className="size-3.5" /> Swap
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted-foreground">No assets match your search.</p>
          )}

          <p className="mt-8 max-w-3xl text-xs text-muted-foreground">
            Prices are indicative and update regularly. Final checkout price may change before confirmation.
          </p>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="bg-gradient-primary flex flex-col items-start justify-between gap-4 rounded-3xl px-6 py-8 sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-xl font-extrabold text-primary-foreground sm:text-2xl">Ready to get started?</h2>
              <p className="mt-1 text-sm text-primary-foreground/80">Buy or swap crypto with transparent fees in minutes.</p>
            </div>
            <button
              onClick={() => goBuy("BTC")}
              className="inline-flex items-center gap-2 rounded-2xl bg-background px-6 py-3 text-sm font-bold text-foreground transition-transform hover:-translate-y-0.5"
            >
              Buy crypto <ArrowRight className="size-4" />
            </button>
          </div>
        </section>
      </main>
    </PageChrome>
  );
}