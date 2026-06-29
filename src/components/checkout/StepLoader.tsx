import { Loader2 } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";

export type LoaderLabel = string;

const STAGES = ["Amount", "Details", "Verification", "Wallet", "Review", "Success"];

export function StepLoader({
  label, coin, fiat, spend, receive, total, money,
}: {
  label: LoaderLabel;
  coin: string;
  fiat: string;
  spend: string;
  receive: number;
  total: number;
  money: (n: number) => string;
}) {
  const asset = getAsset(coin)!;
  const amount = parseFloat(spend) || 0;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <div className="animate-scale-in w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-elegant">
        <div className="mb-5 flex items-center justify-center gap-1.5">
          {STAGES.map((s) => (
            <span key={s} className="h-1 flex-1 rounded-full bg-secondary">
              <span className="block h-full w-full origin-left animate-pulse rounded-full bg-primary/40" />
            </span>
          ))}
        </div>

        <div className="relative mx-auto grid size-16 place-items-center">
          <Loader2 className="absolute size-16 animate-spin text-primary/30" />
          <CryptoIcon symbol={asset.symbol} color={asset.iconColor} size={40} />
        </div>

        <h3 className="mt-5 font-display text-base font-bold text-foreground">{label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Please wait a moment.</p>

        <div className="mt-5 rounded-2xl bg-surface p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">You spend</span>
            <span className="font-bold text-foreground">{money(amount)} {fiat}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">You receive</span>
            <span className="font-bold text-foreground">{formatTokenAmount(receive)} {asset.symbol}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-foreground">{money(total)} {fiat}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
