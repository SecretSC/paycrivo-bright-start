import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Repeat, X } from "lucide-react";
import { clearExchangeDraft, loadExchangeDraft, type ExchangeState } from "@/lib/exchange";
import { getAsset } from "@/data/cryptoAssets";

export function UnfinishedExchangeBanner() {
  const [draft, setDraft] = useState<ExchangeState | null>(null);

  useEffect(() => {
    const d = loadExchangeDraft();
    if (d && (d.step > 0 || d.email || d.wallet)) setDraft(d);
  }, []);

  if (!draft) return null;
  const send = getAsset(draft.sendCoin);
  const receive = getAsset(draft.receiveCoin);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-accent/40 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Repeat className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">You have an unfinished exchange</div>
          <div className="truncate text-xs text-muted-foreground">
            {send && receive ? `${draft.sendAmount} ${send.symbol} → ${receive.symbol}` : "Continue where you left off"}
          </div>
        </div>
        <Link to="/exchange/checkout"
          className="bg-gradient-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
          Continue <ArrowRight className="size-4" />
        </Link>
        <button onClick={() => { clearExchangeDraft(); setDraft(null); }}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
