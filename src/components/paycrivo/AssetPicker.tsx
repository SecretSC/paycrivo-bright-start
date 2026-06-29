import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Star, X } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import {
  orderedAssets,
  pinnedAssets,
  getAsset,
  formatUsd,
  type CryptoAsset,
} from "@/data/cryptoAssets";
import { cn } from "@/lib/utils";

const RECENT_KEY = "paycrivo-recent-assets";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function AssetRow({
  asset,
  active,
  onSelect,
}: {
  asset: CryptoAsset;
  active: boolean;
  onSelect: () => void;
}) {
  const up = asset.mockChange24h >= 0;
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-secondary",
      )}
    >
      <CoinIcon symbol={asset.symbol} color={asset.iconColor} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{asset.name}</span>
          {asset.isPopular && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              Popular
            </span>
          )}
          {asset.isStablecoin && (
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
              Stable
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{asset.symbol}</span>
          {asset.supportedNetworks.slice(0, 2).map((nw) => (
            <span
              key={nw}
              className="hidden rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline"
            >
              {nw}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold text-foreground">${formatUsd(asset.mockPriceUsd)}</div>
        <div className={cn("text-xs font-semibold", up ? "text-success" : "text-destructive")}>
          {up ? "+" : ""}
          {asset.mockChange24h.toFixed(2)}%
        </div>
      </div>
      {active && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

export function AssetPicker({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = getAsset(value) ?? orderedAssets[0];

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    setQuery("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open]);

  const pick = (symbol: string) => {
    onChange(symbol);
    try {
      const next = [symbol, ...readRecent().filter((s) => s !== symbol)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return orderedAssets;
    return orderedAssets.filter(
      (a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q),
    );
  }, [q]);

  const recentAssets = recent
    .map((s) => getAsset(s))
    .filter((a): a is CryptoAsset => Boolean(a));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-border bg-card text-left transition-all hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "px-2.5 py-2" : "px-3.5 py-3",
          className,
        )}
        aria-haspopup="dialog"
      >
        <CoinIcon symbol={selected.symbol} color={selected.iconColor} size={compact ? 24 : 28} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-foreground">{selected.symbol}</span>
          {!compact && (
            <span className="block truncate text-xs text-muted-foreground">{selected.name}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-label="Select a crypto asset"
            className="animate-scale-in flex h-full w-full flex-col overflow-hidden bg-popover shadow-elegant sm:h-auto sm:max-h-[80vh] sm:max-w-lg sm:rounded-3xl sm:border sm:border-border"
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-bold text-foreground">Select asset</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* search */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary/50">
                <Search className="size-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or ticker…"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                    <X className="size-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 pt-2">
              {!q && recentAssets.length > 0 && (
                <Section label="Recently selected">
                  {recentAssets.map((a) => (
                    <AssetRow
                      key={`recent-${a.symbol}`}
                      asset={a}
                      active={a.symbol === value}
                      onSelect={() => pick(a.symbol)}
                    />
                  ))}
                </Section>
              )}

              {!q && (
                <Section label="Top traded" icon={<Star className="size-3.5 text-primary" />}>
                  {pinnedAssets.slice(0, 8).map((a) => (
                    <AssetRow
                      key={`top-${a.symbol}`}
                      asset={a}
                      active={a.symbol === value}
                      onSelect={() => pick(a.symbol)}
                    />
                  ))}
                </Section>
              )}

              <Section label={q ? `Results (${filtered.length})` : "All assets"}>
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No assets match “{query}”.
                  </p>
                ) : (
                  filtered.map((a) => (
                    <AssetRow
                      key={a.symbol}
                      asset={a}
                      active={a.symbol === value}
                      onSelect={() => pick(a.symbol)}
                    />
                  ))
                )}
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
