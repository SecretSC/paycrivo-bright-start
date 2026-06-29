import { Loader2 } from "lucide-react";
import { Logo } from "@/components/paycrivo/Logo";

export function ExchangeLoader({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="animate-scale-in w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
        <Logo />
        <div className="relative mx-auto mt-6 grid size-14 place-items-center">
          <Loader2 className="absolute size-14 animate-spin text-primary/30" />
          <span className="size-3 rounded-full bg-primary" />
        </div>
        <h3 className="mt-5 font-display text-base font-bold text-foreground">{label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">This only takes a moment.</p>
      </div>
    </div>
  );
}
