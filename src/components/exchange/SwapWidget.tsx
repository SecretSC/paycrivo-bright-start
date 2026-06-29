import { ArrowDownUp, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { AssetPicker } from "@/components/paycrivo/AssetPicker";
import { CustomSelect, type SelectOption } from "@/components/paycrivo/CustomSelect";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import { networksForAsset } from "@/lib/exchange";
import { useExchangeQuote } from "@/services/exchangeQuote";
import { formatUtcTime } from "@/services/priceService";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export type SwapState = {
  sendAmount: string;
  sendCoin: string;
  sendNetwork: string;
  receiveCoin: string;
  receiveNetwork: string;
};

export function SwapWidget({
  state,
  onChange,
  onSubmit,
  submitLabel,
  title = "Exchange crypto",
  className,
}: {
  state: SwapState;
  onChange: (patch: Partial<SwapState>) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  title?: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  const sameAsset = state.sendCoin === state.receiveCoin;
  const quote = useExchangeQuote(state.sendAmount, state.sendCoin, state.receiveCoin);
  const sendAsset = getAsset(state.sendCoin)!;
  const receiveAsset = getAsset(state.receiveCoin)!;

  const sendNetworks = networksForAsset(state.sendCoin);
  const receiveNetworks = networksForAsset(state.receiveCoin);
  const sendNetOpts: SelectOption[] = sendNetworks.map((n) => ({ value: n, label: n }));
  const receiveNetOpts: SelectOption[] = receiveNetworks.map((n) => ({ value: n, label: n }));

  const swapDirection = () => {
    onChange({
      sendCoin: state.receiveCoin,
      receiveCoin: state.sendCoin,
      sendNetwork: networksForAsset(state.receiveCoin)[0],
      receiveNetwork: networksForAsset(state.sendCoin)[0],
    });
  };

  const pickSend = (sym: string) => onChange({ sendCoin: sym, sendNetwork: networksForAsset(sym)[0] });
  const pickReceive = (sym: string) => onChange({ receiveCoin: sym, receiveNetwork: networksForAsset(sym)[0] });

  return (
    <div className={cn("w-full rounded-3xl border border-border bg-card p-5 shadow-elegant sm:p-6", className)}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">0% first exchange</span>
      </div>

      {/* You send */}
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">You send</label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-primary/50">
        <input
          inputMode="decimal" value={state.sendAmount}
          onChange={(e) => onChange({ sendAmount: e.target.value.replace(/[^0-9.]/g, "") })}
          className="w-full bg-transparent pl-2 text-2xl font-bold text-foreground outline-none"
          aria-label="Amount to send"
        />
        <AssetPicker value={state.sendCoin} onChange={pickSend} className="w-36 shrink-0" compact />
      </div>
      {sendNetworks.length > 1 && (
        <div className="mt-2">
          <CustomSelect options={sendNetOpts} value={state.sendNetwork} onChange={(v) => onChange({ sendNetwork: v })} />
        </div>
      )}

      {/* swap direction */}
      <div className="my-3 flex justify-center">
        <button
          type="button" onClick={swapDirection}
          className="grid size-10 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-transform hover:rotate-180 hover:border-primary/40"
          aria-label="Swap send and receive assets"
        >
          <ArrowDownUp className="size-4" />
        </button>
      </div>

      {/* You receive */}
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">You receive (estimated)</label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2">
        <span className="w-full truncate pl-2 text-2xl font-bold text-foreground">
          {sameAsset ? "—" : formatTokenAmount(quote.netReceive)}
        </span>
        <AssetPicker value={state.receiveCoin} onChange={pickReceive} className="w-36 shrink-0" compact />
      </div>
      {receiveNetworks.length > 1 && (
        <div className="mt-2">
          <CustomSelect options={receiveNetOpts} value={state.receiveNetwork} onChange={(v) => onChange({ receiveNetwork: v })} />
        </div>
      )}

      {sameAsset && (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          <AlertTriangle className="size-4 shrink-0" /> Choose two different assets to exchange.
        </p>
      )}

      {/* rate + fees */}
      <div className="mt-4 space-y-2 rounded-2xl bg-surface p-4 text-sm">
        <Row label="Exchange rate" value={`1 ${sendAsset.symbol} ≈ ${formatTokenAmount(quote.rate)} ${receiveAsset.symbol}`} />
        <Row label="Network fee (est.)" value={`${formatTokenAmount(quote.networkFee)} ${receiveAsset.symbol}`} />
        <Row label="PayCrivo fee" value={quote.firstExchange ? "0%" : `${formatTokenAmount(quote.paycrivoFee)} ${receiveAsset.symbol}`} />
        {quote.firstExchange && (
          <div className="flex items-center gap-1.5 border-t border-border pt-2 text-success">
            <ShieldCheck className="size-3.5 shrink-0" />
            <span className="font-semibold">First exchange includes 0% PayCrivo fee</span>
          </div>
        )}
        <Row label="Estimated time" value="5–30 min" />
        <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
          <span>
            {quote.status === "live" ? "Live price" : "Price estimate"}
            {hydrated ? ` · updated ${formatUtcTime(quote.lastUpdated)}` : ""}
          </span>
        </div>
      </div>

      {onSubmit && (
        <button
          onClick={onSubmit}
          disabled={sameAsset}
          className="bg-gradient-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel ?? "Exchange now"} <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
