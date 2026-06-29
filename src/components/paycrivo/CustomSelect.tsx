import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  sub?: string;
  leading?: ReactNode;
};

export function CustomSelect({
  options,
  value,
  onChange,
  className,
  align = "left",
  compact = false,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  align?: "left" | "right";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-border bg-card text-left transition-all hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "px-3 py-2" : "px-3.5 py-3",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {selected?.label}
          </span>
          {selected?.sub && (
            <span className="block truncate text-xs text-muted-foreground">{selected.sub}</span>
          )}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "animate-scale-in absolute z-50 mt-2 max-h-72 w-full min-w-[16rem] overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-elegant",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                )}
              >
                {opt.leading}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {opt.label}
                  </span>
                  {opt.sub && (
                    <span className="block truncate text-xs text-muted-foreground">{opt.sub}</span>
                  )}
                </span>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}