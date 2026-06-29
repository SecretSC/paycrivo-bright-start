import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { FiatSelector } from "./FiatSelector";
import { AssetPicker } from "./AssetPicker";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { fiats } from "@/lib/paycrivo-data";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import { useQuote, formatUtcTime } from "@/services/marketDataService";
import { StepLoader } from "@/components/checkout/StepLoader";
import { useHydrated } from "@/hooks/use-hydrated";

export function BuyWidget() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [spend, setSpend] = useState("500");
  const [fiat, setFiat] = useState("USD");
  const [coin, setCoin] = useState("BTC");
  const [method, setMethod] = useState("card");
  const [loading, setLoading] = useState(false);

  const selectedCoin = getAsset(coin)!;
  const selectedFiat = fiats.find((f) => f.code === fiat)!;
  const { fees: calc, priceFiat, status, lastUpdated, money } = useQuote(spend, coin, fiat);

  const goToCheckout = () => {
    setLoading(true);
    window.setTimeout(() => navigate({ to: "/buy", search: { spend, fiat, coin, method } }), 2200);
  };

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
      <PaymentMethodSelector value={method} onChange={setMethod} fiat={fiat} />

      <div className="mt-4 space-y-2 rounded-2xl bg-surface p-4 text-sm">
        <Row label="Exchange rate" value={`1 ${coin} = ${money(priceFiat)}`} />
        <Row label="Service fee" value={money(calc.serviceFee)} />
        <Row label="Network fee" value={money(calc.networkFee)} />
        <Row label="PayCrivo fee" value={money(calc.paycrivoFee)} />
        {calc.firstPurchase && (
          <div className="flex items-center gap-1.5 border-t border-border pt-2 text-success">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span className="font-semibold">First purchase includes 0% PayCrivo fee</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span>{status === "live" ? "Live rate" : "Estimated rate"}{hydrated ? ` · updated ${formatUtcTime(lastUpdated)}` : ""}</span>
        </div>
      </div>

      <button
        onClick={goToCheckout}
        className="bg-gradient-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        Buy {selectedCoin.name} <ArrowRight className="size-4" />
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> Secure checkout · transparent fees · 24/7 support
      </p>
      {loading && (
        <StepLoader
          label="Preparing secure checkout…"
          coin={coin} fiat={fiat} spend={spend}
          receive={calc.receive} total={calc.total} money={money}
        />
      )}
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
