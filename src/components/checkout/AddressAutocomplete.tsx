import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";
import { searchAddress, type AddressSuggestion } from "@/services/addressService";
import { cn } from "@/lib/utils";

export function AddressAutocomplete({
  value,
  country,
  error,
  onChange,
  onSelect,
}: {
  value: string;
  country: string;
  error?: boolean;
  onChange: (v: string) => void;
  onSelect: (r: AddressSuggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const justSelected = useRef(false);

  useEffect(() => {
    if (justSelected.current) { justSelected.current = false; return; }
    if (value.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { results, degraded } = await searchAddress(value, country);
      setResults(results);
      setDegraded(degraded);
      setOpen(true);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [value, country]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (r: AddressSuggestion) => {
    justSelected.current = true;
    onSelect(r);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={ref}>
      <div className={cn("flex items-center gap-2 rounded-2xl border bg-surface px-3 py-3 transition-colors focus-within:border-primary/60",
        error ? "border-destructive" : "border-border")}>
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Start typing your address…"
          className="w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {open && (results.length > 0 || degraded) && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-elegant">
          {degraded && (
            <p className="flex items-start gap-2 border-b border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Could not verify address right now. Please check manually.
            </p>
          )}
          <div className="max-h-64 overflow-y-auto scrollbar-custom">
            {results.map((r, i) => (
              <button key={i} type="button" onClick={() => pick(r)}
                className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-secondary">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.label}</span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">No matches. Keep typing or enter manually.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
