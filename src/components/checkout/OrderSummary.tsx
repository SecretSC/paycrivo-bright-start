import { CoinIcon } from "@/components/paycrivo/CoinIcon";
import {
  computeFees,
  fiatByCode,
  getAsset,
  getPaymentMethod,
} from "@/lib/checkout";
import { formatTokenAmount, formatUsd } from "@/data/cryptoAssets";

export function OrderSummary({
  spend,
  fiat,
  coin,
  method,
  network,
  wallet,
}: {
  spend: string;
  fiat: string;
  coin: string;
  method: string;
  network?: string;
  wallet?: string;
}) {
  const asset = getAsset(coin)!;
  const fiatInfo = fiatByCode(fiat);
  const fees = computeFees(parseFloat(spend) || 0, asset, true);
  const sym = fiatInfo.symbol;
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h3 className="font-display text-base font-bold text-foreground">Order summary</h3>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3">
        <CoinIcon symbol={asset.symbol} color={asset.iconColor} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-foreground">{asset.name}</div>
          <div className="text-xs text-muted-foreground">{asset.symbol}{network ? ` · ${network}` : ""}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-foreground">
            {formatTokenAmount(fees.receive)} {asset.symbol}
          </div>
          <div className="text-xs text-muted-foreground">You receive</div>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <Row label="You spend" value={`${money(fees.amount)} ${fiat}`} />
        <Row label="Exchange rate" value={`1 ${coin} = ${sym}${formatUsd(asset.mockPriceUsd)}`} />
        <Row label="Service fee (1%)" value={money(fees.serviceFee)} />
        <Row label="Network fee" value={money(fees.networkFee)} />
        <Row label="PayCrivo fee" value={money(fees.paycrivoFee)} />
        <div className="flex items-center justify-between">
          <span className="font-medium text-success">First purchase discount</span>
          <span className="font-bold text-success">−{money(fees.discount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Payment method</span>
          <span className="font-semibold text-foreground">{getPaymentMethod(method).name}</span>
        </div>
        {wallet && (
          <Row
            label="Wallet"
            value={`${wallet.slice(0, 6)}…${wallet.slice(-4)}`}
          />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-bold text-foreground">Total cost</span>
        <span className="font-display text-lg font-bold text-foreground">{money(fees.total)} {fiat}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
