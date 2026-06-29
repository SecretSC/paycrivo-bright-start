import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, CreditCard, Landmark, Smartphone } from "lucide-react";
import { paymentMethods, getPaymentMethod, type PaymentMethodDef } from "@/lib/checkout";
import { cn } from "@/lib/utils";

function MethodIcon({ icon }: { icon: PaymentMethodDef["icon"] }) {
  const base = "grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface";
  switch (icon) {
    case "apple":
      return <span className={cn(base, "text-[10px] font-bold tracking-tight text-foreground")}>Pay</span>;
    case "google":
      return <span className={cn(base, "text-[10px] font-bold tracking-tight text-foreground")}>GPay</span>;
    case "bank":
      return <span className={base}><Building2 className="size-[18px] text-primary" /></span>;
    case "sepa":
      return <span className={base}><Landmark className="size-[18px] text-primary" /></span>;
    case "mobilepay":
      return <span className={cn(base, "bg-[#5a78ff]/15")}><Smartphone className="size-[18px] text-[#5a78ff]" /></span>;
    case "pix":
      return <span className={cn(base, "bg-[#32bcad]/15 text-xs font-bold text-[#1ba39c]")}>PIX</span>;
    default:
      return <span className={base}><CreditCard className="size-[18px] text-primary" /></span>;
  }
}

function StatusBadge({ status }: { status: PaymentMethodDef["status"] }) {
  if (status === "available")
    return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">Available</span>;
  if (status === "staging")
    return <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">Staging</span>;
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Coming soon</span>;
}

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
      <MethodIcon icon={m.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-foreground">{m.name}</span>
          <StatusBadge status={m.status} />
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{m.desc} · {m.speed}</div>
      </div>
      <span className="grid size-5 shrink-0 place-items-center">{active && <Check className="size-4 text-primary" />}</span>
    </button>
  );
}

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = getPaymentMethod(value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-primary/40"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MethodIcon icon={selected.icon} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">{selected.name}</span>
            <StatusBadge status={selected.status} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{selected.desc} · {selected.speed}</div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div role="listbox" className="animate-scale-in absolute z-50 mt-2 w-full space-y-1.5 rounded-2xl border border-border bg-popover p-2 shadow-elegant">
          {paymentMethods.map((m) => (
            <Row key={m.id} m={m} active={m.id === value} onSelect={() => { onChange(m.id); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}
