import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { computeFees, fiatByCode, getAsset, getPaymentMethod } from "@/lib/checkout";
import { formatTokenAmount, formatUsd } from "@/data/cryptoAssets";
import { usePrices, formatUtcTime } from "@/services/priceService";
import { cn } from "@/lib/utils";

export function OrderSummary({
  spend, fiat, coin, method, network, wallet, ownership,
}: {
  spend: string;
  fiat: string;
  coin: string;
  method: string;
  network?: string;
  wallet?: string;
  ownership?: "none" | "confirmed" | "manual";
}) {
  const asset = getAsset(coin)!;
  const fiatInfo = fiatByCode(fiat);
  const snap = usePrices();
  const price = snap.prices[coin]?.price ?? asset.mockPriceUsd;
  const fees = computeFees(parseFloat(spend) || 0, asset, true, price);
  const sym = fiatInfo.symbol;
  const money = (n: number) => `${sym}${n.toFixed(2)}`;
  const [showFees, setShowFees] = useState(false);
  const totalFees = fees.serviceFee + fees.networkFee + fees.paycrivoFee - fees.discount;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="text-sm font-bold text-foreground">Order summary</h3>

      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-surface p-2.5">
        <CryptoIcon symbol={asset.symbol} color={asset.iconColor} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground">{asset.name}</div>
          <div className="truncate text-xs text-muted-foreground">{asset.symbol}{network ? ` · ${network}` : ""}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-foreground">{formatTokenAmount(fees.receive)}</div>
          <div className="text-[11px] text-muted-foreground">You receive</div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-[13px]">
        <Row label="You spend" value={`${money(fees.amount)} ${fiat}`} />
        <Row label="Rate" value={`1 ${coin} = ${sym}${formatUsd(price)}`} />
        <Row label="Payment" value={getPaymentMethod(method).name} />
        {wallet && <Row label="Wallet" value={`${wallet.slice(0, 6)}…${wallet.slice(-4)}`} />}
        {ownership && ownership !== "none" && (
          <Row label="Wallet ownership" value={ownership === "confirmed" ? "Confirmed" : "Manual review"} />
        )}

        <button
          type="button"
          onClick={() => setShowFees((v) => !v)}
          className="flex w-full items-center justify-between py-0.5 text-left"
        >
          <span className="text-muted-foreground">Fees</span>
          <span className="flex items-center gap-1 font-semibold text-foreground">
            {money(totalFees)}
            <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", showFees && "rotate-180")} />
          </span>
        </button>
        {showFees && (
          <div className="space-y-1 rounded-lg bg-surface px-2.5 py-2">
            <Row label="Service fee (1%)" value={money(fees.serviceFee)} small />
            <Row label="Network fee" value={money(fees.networkFee)} small />
            <Row label="PayCrivo fee" value={money(fees.paycrivoFee)} small />
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-success">First purchase discount</span>
              <span className="font-bold text-success">−{money(fees.discount)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-bold text-foreground">Total</span>
        <span className="text-base font-bold text-foreground">{money(fees.total)} {fiat}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {snap.status === "live" ? "Live price" : "Price estimate"} · updated {formatUtcTime(snap.lastUpdated)}
      </p>
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", small && "text-xs")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
