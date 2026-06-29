import { useMemo, useState } from "react";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import { CustomSelect, type SelectOption } from "./CustomSelect";
import { cryptos, fiats, paymentMethods, formatPrice } from "@/lib/paycrivo-data";

export function BuyWidget() {
  const [spend, setSpend] = useState("500");
  const [fiat, setFiat] = useState("USD");
  const [coin, setCoin] = useState("BTC");
  const [method, setMethod] = useState("card");

  const fiatOpts: SelectOption[] = fiats.map((f) => ({
    value: f.code,
    label: f.code,
    sub: f.name,
    leading: <span className="text-lg leading-none">{f.flag}</span>,
  }));

  const coinOpts: SelectOption[] = cryptos.map((c) => ({
    value: c.symbol,
    label: c.symbol,
    sub: c.name,
    leading: <CoinIcon symbol={c.symbol} color={c.color} size={26} />,
  }));

  const methodOpts: SelectOption[] = paymentMethods.map((m) => ({
    value: m.id,
    label: m.name,
    sub: m.desc,
  }));

  const selectedCoin = cryptos.find((c) => c.symbol === coin)!;
  const selectedFiat = fiats.find((f) => f.code === fiat)!;

  const calc = useMemo(() => {
    const amount = parseFloat(spend) || 0;
    const serviceFee = amount * 0.01;
    const networkFee = 1.99;
    const paycrivoFee = 0; // first purchase 0%
    const totalFees = serviceFee + networkFee + paycrivoFee;
    const net = Math.max(amount - totalFees, 0);
    const receive = net / selectedCoin.price;
    return { amount, serviceFee, networkFee, paycrivoFee, receive };
  }, [spend, selectedCoin]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-elegant sm:p-6" id="buy">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Buy Crypto</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          <ShieldCheck className="size-3.5" /> 0% fee
        </span>
      </div>

      {/* You Spend */}
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        You Spend
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-primary/50">
        <div className="flex flex-1 items-center pl-2">
          <span className="mr-1 text-lg font-bold text-muted-foreground">{selectedFiat.symbol}</span>
          <input
            inputMode="decimal"
            value={spend}
            onChange={(e) => setSpend(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent text-2xl font-bold text-foreground outline-none"
            aria-label="Amount to spend"
          />
        </div>
        <CustomSelect
          className="w-32 shrink-0"
          options={fiatOpts}
          value={fiat}
          onChange={setFiat}
          align="right"
          compact
        />
      </div>

      {/* arrow */}
      <div className="my-2 flex justify-center">
        <div className="grid size-9 place-items-center rounded-full border border-border bg-card text-primary shadow-sm">
          <ArrowRight className="size-4 rotate-90" />
        </div>
      </div>

      {/* You Receive */}
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        You Receive
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2">
        <div className="flex flex-1 items-center pl-2">
          <span className="w-full truncate text-2xl font-bold text-foreground">
            {calc.receive.toLocaleString("en-US", { maximumFractionDigits: 6 })}
          </span>
        </div>
        <CustomSelect
          className="w-36 shrink-0"
          options={coinOpts}
          value={coin}
          onChange={setCoin}
          align="right"
          compact
        />
      </div>

      {/* Payment method */}
      <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Payment Method
      </label>
      <CustomSelect options={methodOpts} value={method} onChange={setMethod} />

      {/* Fee breakdown */}
      <div className="mt-4 space-y-2 rounded-2xl bg-surface p-4 text-sm">
        <Row label="Exchange rate" value={`1 ${coin} = ${selectedFiat.symbol}${formatPrice(selectedCoin.price)}`} />
        <Row label="Service fee (1%)" value={`${selectedFiat.symbol}${calc.serviceFee.toFixed(2)}`} />
        <Row label="Network fee" value={`${selectedFiat.symbol}${calc.networkFee.toFixed(2)}`} />
        <Row label="PayCrivo fee" value={`${selectedFiat.symbol}${calc.paycrivoFee.toFixed(2)}`} />
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-medium text-success">First purchase discount</span>
          <span className="font-bold text-success">−100% PayCrivo fee</span>
        </div>
      </div>

      <button className="bg-gradient-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 active:translate-y-0">
        Buy {coin} <ArrowRight className="size-4" />
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> All fees shown before checkout · No hidden costs
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