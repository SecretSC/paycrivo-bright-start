import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, X } from "lucide-react";
import { clearDraft, loadDraft, type CheckoutState } from "@/lib/checkout";
import { getAsset } from "@/data/cryptoAssets";

export function UnfinishedOrderBanner() {
  const [draft, setDraft] = useState<CheckoutState | null>(null);

  useEffect(() => {
    const d = loadDraft();
    // Only show if user actually made progress beyond the first step or entered data.
    if (d && (d.step > 0 || d.email || d.wallet)) setDraft(d);
  }, []);

  if (!draft) return null;
  const asset = getAsset(draft.coin);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-accent/40 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Clock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">You have an unfinished purchase</div>
          <div className="truncate text-xs text-muted-foreground">
            {asset ? `${asset.name} · ${draft.spend} ${draft.fiat}` : "Continue where you left off"}
          </div>
        </div>
        <Link to="/buy" search={{}}
          className="bg-gradient-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
          Continue <ArrowRight className="size-4" />
        </Link>
        <button onClick={() => { clearDraft(); setDraft(null); }}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
