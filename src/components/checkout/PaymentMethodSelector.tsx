import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { paymentMethodsForFiat, getPaymentMethod, type PaymentMethodDef } from "@/data/paymentMethods";
import { PaymentBrandIcon } from "./PaymentIcons";
import { cn } from "@/lib/utils";

function Row({ m, active, onSelect }: { m: PaymentMethodDef; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
        active ? "border-primary/50 bg-accent" : "border-border bg-card hover:bg-secondary",
      )}
    >
      <PaymentBrandIcon icon={m.icon} size={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-foreground">{m.name}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.desc} · {m.speed}</div>
      </div>
      <span className="grid size-5 shrink-0 place-items-center">{active && <Check className="size-4 text-primary" />}</span>
    </button>
  );
}

export function PaymentMethodSelector({
  value,
  onChange,
  fiat = "USD",
}: {
  value: string;
  onChange: (id: string) => void;
  fiat?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const available = useMemo(() => paymentMethodsForFiat(fiat), [fiat]);

  // Auto-select the first available method when the current one isn't offered for this fiat.
  useEffect(() => {
    if (!available.some((m) => m.id === value) && available[0]) {
      onChange(available[0].id);
    }
  }, [available, value, onChange]);

  const selected = getPaymentMethod(available.some((m) => m.id === value) ? value : available[0]?.id ?? value);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-primary/40"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <PaymentBrandIcon icon={selected.icon} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground">{selected.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{selected.desc} · {selected.speed}</div>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-label="Select a payment method"
            className="animate-scale-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-popover shadow-elegant sm:h-auto sm:max-h-[80vh] sm:max-w-md sm:rounded-3xl sm:border sm:border-border"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-bold text-foreground">Payment method</h3>
              <button type="button" onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="scrollbar-custom flex-1 space-y-2 overflow-y-auto p-3">
              {available.map((m) => (
                <Row key={m.id} m={m} active={m.id === selected.id} onSelect={() => { onChange(m.id); setOpen(false); }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
