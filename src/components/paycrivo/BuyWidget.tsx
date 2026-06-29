import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info, Lock, ShieldCheck } from "lucide-react";
import { FiatSelector } from "./FiatSelector";
import { AssetPicker } from "./AssetPicker";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { fiats } from "@/lib/paycrivo-data";
import { getAsset, formatUsd, formatTokenAmount } from "@/data/cryptoAssets";
import { computeFees } from "@/lib/checkout";
import { usePrices } from "@/services/priceService";

export function BuyWidget() {
  const navigate = useNavigate();
  const [spend, setSpend] = useState("500");
  const [fiat, setFiat] = useState("USD");
  const [coin, setCoin] = useState("BTC");
  const [method, setMethod] = useState("card");
  const snap = usePrices();

  const selectedCoin = getAsset(coin)!;
  const selectedFiat = fiats.find((f) => f.code === fiat)!;
  const price = snap.prices[coin]?.price ?? selectedCoin.mockPriceUsd;

  const calc = useMemo(
    () => computeFees(parseFloat(spend) || 0, selectedCoin, true, price),
    [spend, selectedCoin, price],
  );

  const goToCheckout = () => navigate({ to: "/buy", search: { spend, fiat, coin, method } });

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-elegant sm:p-6" id="buy">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Buy Crypto</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <ShieldCheck className="size-3.5" /> 0% fee
        </span>
      </div>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">You Spend</label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-primary/50">
        <div className="flex flex-1 items-center pl-2">
          <span className="mr-1 text-lg font-bold text-muted-foreground">{selectedFiat.symbol}</span>
          <input
            inputMode="decimal" value={spend}
            onChange={(e) => setSpend(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent text-2xl font-bold text-foreground outline-none"
            aria-label="Amount to spend"
          />
        </div>
        <FiatSelector className="w-32 shrink-0" value={fiat} onChange={setFiat} compact />
      </div>

      <div className="my-2 flex justify-center">
        <div className="grid size-9 place-items-center rounded-full border border-border bg-card text-primary shadow-sm">
          <ArrowRight className="size-4 rotate-90" />
        </div>
      </div>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">You Receive</label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2">
        <div className="flex flex-1 items-center pl-2">
          <span className="w-full truncate text-2xl font-bold text-foreground">{formatTokenAmount(calc.receive)}</span>
        </div>
        <AssetPicker value={coin} onChange={setCoin} className="w-36 shrink-0" compact />
      </div>

      <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Method</label>
      <PaymentMethodSelector value={method} onChange={setMethod} />

      <div className="mt-4 space-y-2 rounded-2xl bg-surface p-4 text-sm">
        <Row label="Exchange rate" value={`1 ${coin} = ${selectedFiat.symbol}${formatUsd(price)}`} />
        <Row label="Service fee (1%)" value={`${selectedFiat.symbol}${calc.serviceFee.toFixed(2)}`} />
        <Row label="Network fee" value={`${selectedFiat.symbol}${calc.networkFee.toFixed(2)}`} />
        <Row label="PayCrivo fee" value={`${selectedFiat.symbol}${calc.paycrivoFee.toFixed(2)}`} />
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-medium text-success">First purchase discount</span>
          <span className="font-bold text-success">−100% PayCrivo fee</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{snap.status === "live" ? "Live price" : "Price estimate"}</span>
        </div>
      </div>

      <button
        onClick={goToCheckout}
        className="bg-gradient-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        Buy {selectedCoin.name} <ArrowRight className="size-4" />
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> No real payment is processed in staging.
      </p>
      <p className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-center text-xs font-medium text-muted-foreground">
        <Info className="size-3.5 shrink-0" /> Payment integrations are not active in staging.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
