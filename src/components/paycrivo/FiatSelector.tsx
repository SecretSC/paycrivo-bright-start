import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { fiats, type Fiat } from "@/lib/paycrivo-data";
import { cn } from "@/lib/utils";

const RECENT_KEY = "paycrivo-recent-fiat";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function Flag({ flag }: { flag: string }) {
  return (
    <span
      className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-base leading-none"
      aria-hidden
    >
      {flag}
    </span>
  );
}

function Row({ f, active, onSelect }: { f: Fiat; active: boolean; onSelect: () => void }) {
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
      <Flag flag={f.flag} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{f.code}</span>
          <span className="text-xs font-semibold text-muted-foreground">{f.symbol}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{f.name}</div>
      </div>
      <span className="grid size-5 shrink-0 place-items-center">
        {active && <Check className="size-4 text-primary" />}
      </span>
    </button>
  );
}

export function FiatSelector({
  value,
  onChange,
  className,
  compact = false,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = fiats.find((f) => f.code === value) ?? fiats[0];

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

  const pick = (code: string) => {
    onChange(code);
    try {
      const next = [code, ...readRecent().filter((c) => c !== code)].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return fiats;
    return fiats.filter(
      (f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
    );
  }, [q]);

  const popular = fiats.filter((f) => f.popular);
  const recentFiats = recent
    .map((c) => fiats.find((f) => f.code === c))
    .filter((f): f is Fiat => Boolean(f));

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
        <Flag flag={selected.flag} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-foreground">{selected.code}</span>
          {!compact && <span className="block truncate text-xs text-muted-foreground">{selected.name}</span>}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-label="Select a currency"
            className="animate-scale-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-popover shadow-elegant sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-3xl sm:border sm:border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-bold text-foreground">Select currency</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary/50">
                <Search className="size-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search currency or country…"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                    <X className="size-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div className="scrollbar-custom flex-1 overflow-y-auto px-3 pb-4 pt-2">
              {!q && recentFiats.length > 0 && (
                <Group label="Recently selected">
                  {recentFiats.map((f) => (
                    <Row key={`recent-${f.code}`} f={f} active={f.code === value} onSelect={() => pick(f.code)} />
                  ))}
                </Group>
              )}
              {!q && (
                <Group label="Popular">
                  {popular.map((f) => (
                    <Row key={`pop-${f.code}`} f={f} active={f.code === value} onSelect={() => pick(f.code)} />
                  ))}
                </Group>
              )}
              <Group label={q ? `Results (${filtered.length})` : "All currencies"}>
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">No currencies match “{query}”.</p>
                ) : (
                  filtered.map((f) => (
                    <Row key={f.code} f={f} active={f.code === value} onSelect={() => pick(f.code)} />
                  ))
                )}
              </Group>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
