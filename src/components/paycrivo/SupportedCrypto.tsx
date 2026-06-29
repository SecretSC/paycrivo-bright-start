import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search, X } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { orderedAssets, formatUsd, type CryptoAsset } from "@/data/cryptoAssets";
import { usePrices } from "@/services/priceService";
import { cn } from "@/lib/utils";

type Filter =
  | "All"
  | "Popular"
  | "Stablecoins"
  | "Layer 1"
  | "Layer 2"
  | "DeFi"
  | "Meme"
  | "Gaming"
  | "AI";

const filters: Filter[] = [
  "All",
  "Popular",
  "Stablecoins",
  "Layer 1",
  "Layer 2",
  "DeFi",
  "Meme",
  "Gaming",
  "AI",
];

function matches(a: CryptoAsset, f: Filter) {
  switch (f) {
    case "All":
      return true;
    case "Popular":
      return a.isPopular;
    case "Stablecoins":
      return a.isStablecoin;
    default:
      return a.category === f;
  }
}

function AssetCard({ c, price, change }: { c: CryptoAsset; price: number; change: number }) {
  const up = change >= 0;
  return (
    <div className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft">
      <div className="flex w-full items-center justify-between">
        <CryptoIcon symbol={c.symbol} color={c.iconColor} size={36} />
        {c.isPopular && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
            Popular
          </span>
        )}
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">{c.name}</div>
      <div className="text-xs text-muted-foreground">{c.symbol}</div>
      <div className="mt-2 flex w-full items-center justify-between">
        <span className="text-xs font-semibold text-foreground">${formatUsd(price)}</span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold",
            up ? "text-success" : "text-destructive",
          )}
        >
          {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

export function SupportedCrypto() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState(false);
  const snap = usePrices();
  const px = (s: string, m: number) => snap.prices[s]?.price ?? m;
  const ch = (s: string, m: number) => snap.prices[s]?.change24h ?? m;

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    return orderedAssets.filter(
      (a) =>
        matches(a, filter) &&
        (!q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)),
    );
  }, [filter, q]);

  const visible = showAll ? list.slice(0, 60) : list.slice(0, 24);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Supported crypto assets</h2>
        <p className="mt-3 text-muted-foreground">
          Choose from 250+ digital assets. Major coins appear first.
        </p>
      </div>

      {/* search */}
      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 focus-within:border-primary/50">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets by name or ticker…"
            className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear">
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setShowAll(false);
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f
                ? "bg-gradient-primary text-primary-foreground shadow-soft"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {visible.map((c) => (
          <AssetCard key={c.symbol} c={c} price={px(c.symbol, c.mockPriceUsd)} change={ch(c.symbol, c.mockChange24h)} />
        ))}
      </div>

      {list.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">No assets match your search.</p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {!showAll && list.length > 24 && (
          <button
            onClick={() => setShowAll(true)}
            className="rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            Show more
          </button>
        )}
        <button
          onClick={() => setModal(true)}
          className="bg-gradient-primary rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
        >
          View all assets
        </button>
      </div>

      {/* modal */}
      {modal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="animate-scale-in flex h-full w-full flex-col overflow-hidden bg-popover shadow-elegant sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-3xl sm:border sm:border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">All supported assets</h3>
                <p className="text-xs text-muted-foreground">{orderedAssets.length} assets · major coins first</p>
              </div>
              <button
                onClick={() => setModal(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {orderedAssets.map((c) => (
                  <AssetCard key={`modal-${c.symbol}`} c={c} price={px(c.symbol, c.mockPriceUsd)} change={ch(c.symbol, c.mockChange24h)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
