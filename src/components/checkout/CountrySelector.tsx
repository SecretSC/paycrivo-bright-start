import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { countries, type Country } from "@/data/countries";
import { cn } from "@/lib/utils";

function Flag({ flag }: { flag: string }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-base leading-none" aria-hidden>
      {flag}
    </span>
  );
}

function Row({ c, active, onSelect }: { c: Country; active: boolean; onSelect: () => void }) {
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
      <Flag flag={c.flag} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{c.name}</span>
      <span className="text-xs font-semibold text-muted-foreground">{c.dial}</span>
      <span className="grid size-5 shrink-0 place-items-center">{active && <Check className="size-4 text-primary" />}</span>
    </button>
  );
}

export function CountrySelector({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (name: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = countries.find((c) => c.name === value);

  useEffect(() => {
    if (!open) return;
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

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [q]);

  const popular = countries.filter((c) => c.popular);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-2xl border bg-surface px-4 py-3 text-left transition-colors hover:border-primary/40",
          error ? "border-destructive" : "border-border",
        )}
        aria-haspopup="dialog"
      >
        {selected ? <Flag flag={selected.flag} /> : null}
        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? `${selected.name} ${selected.dial}` : "Select country"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div role="dialog" aria-label="Select your country"
            className="animate-scale-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-popover shadow-elegant sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-3xl sm:border sm:border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-bold text-foreground">Select country</h3>
              <button type="button" onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary/50">
                <Search className="size-4 text-muted-foreground" />
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search country or code…"
                  className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground" />
                {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear"><X className="size-4 text-muted-foreground hover:text-foreground" /></button>}
              </div>
            </div>
            <div className="scrollbar-custom flex-1 overflow-y-auto px-3 pb-4 pt-2">
              {!q && (
                <Group label="Popular">
                  {popular.map((c) => <Row key={`pop-${c.code}`} c={c} active={c.name === value} onSelect={() => pick(c.name)} />)}
                </Group>
              )}
              <Group label={q ? `Results (${filtered.length})` : "All countries"}>
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">No countries match “{query}”.</p>
                ) : (
                  filtered.map((c) => <Row key={c.code} c={c} active={c.name === value} onSelect={() => pick(c.name)} />)
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
