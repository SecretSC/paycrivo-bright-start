import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardPaste,
  Copy,
  Info,
  Loader2,
  QrCode,
  ScanFace,
  ShieldCheck,
  FileCheck2,
  Eye,
} from "lucide-react";
import { Logo } from "@/components/paycrivo/Logo";
import { FiatBadge } from "@/components/paycrivo/FiatBadge";
import { AssetPicker } from "@/components/paycrivo/AssetPicker";
import { CustomSelect, type SelectOption } from "@/components/paycrivo/CustomSelect";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CoinIcon } from "@/components/paycrivo/CoinIcon";
import { fiats } from "@/lib/paycrivo-data";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import {
  COUNTRIES,
  MAX_USD,
  MIN_USD,
  clearDraft,
  computeFees,
  defaultCheckout,
  fiatByCode,
  generateOrderId,
  loadDraft,
  networksForAsset,
  paymentMethods,
  saveDraft,
  saveOrder,
  usdValueOf,
  validateWalletAddress,
  type CheckoutState,
} from "@/lib/checkout";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  spend: z.string().optional(),
  fiat: z.string().optional(),
  coin: z.string().optional(),
  method: z.string().optional(),
});

export const Route = createFileRoute("/buy")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Buy crypto — PayCrivo checkout" },
      { name: "description", content: "Complete your crypto purchase securely with PayCrivo." },
    ],
  }),
  component: BuyFlow,
});

const STEPS = ["Amount", "Email", "Details", "Verification", "Wallet", "Review"];

function BuyFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [state, setState] = useState<CheckoutState>(() => {
    const draft = loadDraft();
    const base = draft ?? defaultCheckout;
    return {
      ...base,
      spend: search.spend ?? base.spend,
      fiat: search.fiat ?? base.fiat,
      coin: search.coin ?? base.coin,
      method: search.method ?? base.method,
      step: search.spend ? 0 : base.step,
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const asset = getAsset(state.coin)!;
  const networks = useMemo(() => networksForAsset(state.coin), [state.coin]);

  // keep network valid for asset
  useEffect(() => {
    if (!networks.includes(state.network)) {
      setState((s) => ({ ...s, network: networks[0] }));
    }
  }, [networks]); // eslint-disable-line react-hooks/exhaustive-deps

  // persist draft (not after order created)
  useEffect(() => {
    if (createdId) return;
    saveDraft(state);
  }, [state, createdId]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.step, createdId]);

  const fees = useMemo(
    () => computeFees(parseFloat(state.spend) || 0, asset, true),
    [state.spend, asset],
  );

  const fiatOpts: SelectOption[] = fiats.map((f) => ({
    value: f.code, label: f.code, sub: f.name, leading: <FiatBadge symbol={f.symbol} />,
  }));
  const methodOpts: SelectOption[] = paymentMethods.map((m) => ({
    value: m.id, label: m.name, sub: m.desc,
  }));
  const countryOpts: SelectOption[] = COUNTRIES.map((c) => ({ value: c, label: c }));
  const networkOpts: SelectOption[] = networks.map((n) => ({ value: n, label: n }));

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      const amount = parseFloat(state.spend);
      if (!state.spend || !amount) e.spend = "Enter an amount.";
      else {
        const usd = usdValueOf(amount, state.fiat);
        if (usd < MIN_USD) e.spend = `Minimum purchase is ${MIN_USD} USD equivalent.`;
        else if (usd > MAX_USD) e.spend = `Maximum purchase is ${MAX_USD.toLocaleString()} USD equivalent.`;
      }
    }
    if (step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = "Enter a valid email address.";
      if (!state.agreeTerms) e.agreeTerms = "Please accept the terms to continue.";
    }
    if (step === 2) {
      if (!state.firstName.trim()) e.firstName = "Required.";
      if (!state.lastName.trim()) e.lastName = "Required.";
      if (!state.dob) e.dob = "Required.";
      else {
        const d = new Date(state.dob);
        if (isNaN(d.getTime()) || d > new Date()) e.dob = "Enter a valid date.";
      }
      if (!state.phone.trim()) e.phone = "Required.";
      if (!state.country) e.country = "Select your country.";
      if (!state.address.trim()) e.address = "Required.";
      if (!state.city.trim()) e.city = "Required.";
      if (!state.postal.trim()) e.postal = "Required.";
      if (!state.detailsConfirmed) e.detailsConfirmed = "Please confirm your details.";
    }
    if (step === 4) {
      const w = validateWalletAddress(state.wallet, state.network);
      if (w) e.wallet = w;
      if (!state.network) e.network = "Select a network.";
    }
    if (step === 5) {
      if (!state.riskAck) e.riskAck = "Please acknowledge to confirm.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(state.step)) return;
    set("step", Math.min(state.step + 1, STEPS.length - 1));
  };
  const back = () => {
    setErrors({});
    set("step", Math.max(state.step - 1, 0));
  };

  const confirmOrder = () => {
    if (!validateStep(5)) return;
    setConfirming(true);
    setTimeout(() => {
      const id = generateOrderId();
      saveOrder({
        id,
        createdAt: new Date().toISOString(),
        status: "Awaiting payment integration",
        spend: state.spend,
        fiat: state.fiat,
        coin: state.coin,
        method: state.method,
        wallet: state.wallet,
        network: state.network,
        receive: fees.receive,
        fees,
        email: state.email,
      });
      clearDraft();
      setConfirming(false);
      setCreatedId(id);
      toast.success("Order created in staging");
    }, 1100);
  };

  if (createdId) {
    return <OrderCreated id={createdId} state={state} />;
  }

  const fiatInfo = fiatByCode(state.fiat);

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div ref={topRef} />
      <ProgressBar step={state.step} />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        {/* form */}
        <div className="min-w-0">
          <button
            onClick={() => (state.step === 0 ? navigate({ to: "/" }) : back())}
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {state.step === 0 ? "Back to homepage" : "Back"}
          </button>

          <div key={state.step} className="animate-step-in">
            {state.step === 0 && (
              <Section title="Buy crypto" subtitle="Choose how much you'd like to spend.">
                <Field label="You spend" error={errors.spend}>
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-primary/50">
                    <div className="flex flex-1 items-center pl-2">
                      <span className="mr-1 text-lg font-bold text-muted-foreground">{fiatInfo.symbol}</span>
                      <input
                        inputMode="decimal"
                        value={state.spend}
                        onChange={(e) => set("spend", e.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full bg-transparent text-2xl font-bold text-foreground outline-none"
                      />
                    </div>
                    <CustomSelect className="w-32 shrink-0" options={fiatOpts} value={state.fiat}
                      onChange={(v) => set("fiat", v)} align="right" compact searchable searchPlaceholder="Search currency…" />
                  </div>
                </Field>

                <Field label="You receive">
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2">
                    <span className="flex-1 truncate pl-2 text-2xl font-bold text-foreground">
                      {formatTokenAmount(fees.receive)}
                    </span>
                    <AssetPicker value={state.coin} onChange={(v) => set("coin", v)} className="w-36 shrink-0" compact />
                  </div>
                </Field>

                <Field label="Payment method">
                  <CustomSelect options={methodOpts} value={state.method} onChange={(v) => set("method", v)} />
                </Field>
              </Section>
            )}

            {state.step === 1 && (
              <Section title="Continue with your email" subtitle="We'll use this to send your order updates.">
                <Field label="Email address" error={errors.email}>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@email.com"
                    className={inputCls(errors.email)}
                  />
                </Field>
                <CheckRow checked={state.agreeTerms} onChange={(v) => set("agreeTerms", v)} error={errors.agreeTerms}>
                  I agree to the Terms, Privacy Policy, and Risk Disclosure.
                </CheckRow>
              </Section>
            )}

            {state.step === 2 && (
              <Section title="Your details" subtitle="To complete purchases, your details may need to match your identity document.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" error={errors.firstName}>
                    <input value={state.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls(errors.firstName)} />
                  </Field>
                  <Field label="Last name" error={errors.lastName}>
                    <input value={state.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls(errors.lastName)} />
                  </Field>
                  <Field label="Date of birth" error={errors.dob}>
                    <input type="date" value={state.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls(errors.dob)} />
                  </Field>
                  <Field label="Phone number" error={errors.phone}>
                    <input value={state.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" className={inputCls(errors.phone)} />
                  </Field>
                  <Field label="Country" error={errors.country}>
                    <CustomSelect options={countryOpts} value={state.country} onChange={(v) => set("country", v)} searchable searchPlaceholder="Search country…" />
                  </Field>
                  <Field label="City" error={errors.city}>
                    <input value={state.city} onChange={(e) => set("city", e.target.value)} className={inputCls(errors.city)} />
                  </Field>
                  <Field label="Address" error={errors.address}>
                    <input value={state.address} onChange={(e) => set("address", e.target.value)} className={inputCls(errors.address)} />
                  </Field>
                  <Field label="Postal code" error={errors.postal}>
                    <input value={state.postal} onChange={(e) => set("postal", e.target.value)} className={inputCls(errors.postal)} />
                  </Field>
                </div>
                <CheckRow checked={state.detailsConfirmed} onChange={(v) => set("detailsConfirmed", v)} error={errors.detailsConfirmed}>
                  I confirm these details are correct and match my identity document.
                </CheckRow>
              </Section>
            )}

            {state.step === 3 && (
              <Section title="Identity verification" subtitle="Verification helps protect your purchase and account.">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Status</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                      Required for this order
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <VerifyCard icon={<FileCheck2 className="size-5" />} title="Document check" desc="Government ID" />
                    <VerifyCard icon={<ScanFace className="size-5" />} title="Face check" desc="Quick selfie" />
                    <VerifyCard icon={<Eye className="size-5" />} title="Review" desc="Manual review possible" />
                  </div>
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Full mobile KYC flow will be added in Phase 7. For this prototype you can continue to the wallet step.
                  </p>
                </div>
              </Section>
            )}

            {state.step === 4 && (
              <Section title={`Enter your ${asset.name} wallet address`} subtitle="Your crypto will be delivered to this address.">
                <Field label="Network" error={errors.network}>
                  <CustomSelect options={networkOpts} value={state.network} onChange={(v) => set("network", v)} />
                </Field>
                <Field label="Wallet address" error={errors.wallet}>
                  <div className="flex items-center gap-2">
                    <input value={state.wallet} onChange={(e) => set("wallet", e.target.value)}
                      placeholder={`Your ${asset.symbol} address`} className={inputCls(errors.wallet)} />
                    <button type="button" onClick={async () => {
                      try { const t = await navigator.clipboard.readText(); if (t) { set("wallet", t.trim()); toast.success("Pasted from clipboard"); } }
                      catch { toast.error("Clipboard unavailable"); }
                    }} className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Paste">
                      <ClipboardPaste className="size-5" />
                    </button>
                    <button type="button" onClick={() => toast("QR scanning coming soon")}
                      className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground" aria-label="Scan QR">
                      <QrCode className="size-5" />
                    </button>
                  </div>
                </Field>
                <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Make sure this address supports the selected asset and network. Crypto sent to the wrong network may be lost.
                </p>
                <CheckRow checked={state.saveWallet} onChange={(v) => set("saveWallet", v)}>
                  Save this wallet for later
                </CheckRow>
              </Section>
            )}

            {state.step === 5 && (
              <Section title="Review your order" subtitle="Check everything looks right before confirming.">
                <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
                  <ReviewRow label="You spend" value={`${fiatInfo.symbol}${fees.amount.toFixed(2)} ${state.fiat}`} />
                  <ReviewRow label="You receive" value={`${formatTokenAmount(fees.receive)} ${asset.symbol}`} />
                  <ReviewRow label="Asset" value={asset.name} />
                  <ReviewRow label="Network" value={state.network} />
                  <ReviewRow label="Wallet" value={`${state.wallet.slice(0, 8)}…${state.wallet.slice(-6)}`} copy={state.wallet} />
                  <ReviewRow label="Payment method" value={paymentMethods.find((m) => m.id === state.method)?.name ?? ""} />
                  <ReviewRow label="Service fee" value={`${fiatInfo.symbol}${fees.serviceFee.toFixed(2)}`} />
                  <ReviewRow label="Network fee" value={`${fiatInfo.symbol}${fees.networkFee.toFixed(2)}`} />
                  <ReviewRow label="PayCrivo fee" value={`${fiatInfo.symbol}${fees.paycrivoFee.toFixed(2)}`} />
                  <ReviewRow label="First purchase discount" value={`−${fiatInfo.symbol}${fees.discount.toFixed(2)}`} success />
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-display text-lg font-bold text-foreground">{fiatInfo.symbol}{fees.total.toFixed(2)} {state.fiat}</span>
                  </div>
                </div>
                <CheckRow checked={state.riskAck} onChange={(v) => set("riskAck", v)} error={errors.riskAck}>
                  I understand crypto transactions may be irreversible and prices can change.
                </CheckRow>
              </Section>
            )}
          </div>

          {/* actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            {state.step > 0 && (
              <button onClick={back} className="rounded-2xl border border-border px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                Back
              </button>
            )}
            {state.step < 5 ? (
              <button onClick={next} className="bg-gradient-primary flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
                {state.step === 3 ? "Continue in staging" : "Continue"} <ArrowRight className="size-4" />
              </button>
            ) : (
              <button onClick={confirmOrder} disabled={confirming}
                className="bg-gradient-primary flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-70">
                {confirming ? <><Loader2 className="size-4 animate-spin" /> Creating order…</> : <>Confirm order <Check className="size-4" /></>}
              </button>
            )}
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
            <ShieldCheck className="size-3.5" /> No real payment is processed in staging.
          </p>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary spend={state.spend} fiat={state.fiat} coin={state.coin} method={state.method}
            network={state.step >= 4 ? state.network : undefined} wallet={state.step >= 4 ? state.wallet : undefined} />
        </aside>
      </div>
    </div>
  );
}

/* ---------- Order created ---------- */
function OrderCreated({ id, state }: { id: string; state: CheckoutState }) {
  const asset = getAsset(state.coin)!;
  const fiatInfo = fiatByCode(state.fiat);
  const fees = computeFees(parseFloat(state.spend) || 0, asset, true);
  const timeline = [
    { label: "Order created", status: "complete" as const },
    { label: "Verification", status: "staging" as const },
    { label: "Payment", status: "pending" as const, note: "not integrated" },
    { label: "Processing", status: "pending" as const },
    { label: "Crypto delivery", status: "pending" as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="animate-step-in text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <Check className="size-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Order created</h1>
          <p className="mt-2 text-muted-foreground">Your PayCrivo order has been created in staging.</p>
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <span className="font-mono text-sm font-bold text-foreground">{id}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              Awaiting payment integration
            </span>
          </div>
          <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <Info2 label="Asset" value={`${asset.name} (${asset.symbol})`} />
            <Info2 label="Amount" value={`${fiatInfo.symbol}${fees.amount.toFixed(2)} ${state.fiat}`} />
            <Info2 label="Estimated receive" value={`${formatTokenAmount(fees.receive)} ${asset.symbol}`} />
            <Info2 label="Network" value={state.network} />
            <Info2 label="Wallet" value={`${state.wallet.slice(0, 8)}…${state.wallet.slice(-6)}`} />
            <Info2 label="Created" value={new Date().toLocaleString()} />
          </div>
        </div>

        <Timeline items={timeline} className="mt-6" />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/order/$orderId" params={{ orderId: id }}
            className="bg-gradient-primary flex-1 rounded-2xl px-6 py-3.5 text-center text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
            View order status
          </Link>
          <Link to="/buy" search={{}} reloadDocument
            className="flex-1 rounded-2xl border border-border px-6 py-3.5 text-center text-sm font-bold text-foreground transition-colors hover:bg-secondary">
            Start another purchase
          </Link>
          <Link to="/" className="flex-1 rounded-2xl border border-border px-6 py-3.5 text-center text-sm font-bold text-foreground transition-colors hover:bg-secondary">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- shared pieces ---------- */
export function CheckoutHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Logo />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="size-4 text-success" /> Secure checkout
        </span>
      </div>
    </header>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / STEPS.length) * 100;
  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="text-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="bg-gradient-primary h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 hidden items-center justify-between sm:flex">
          {STEPS.map((label, i) => (
            <div key={label} className={cn("flex items-center gap-1.5 text-xs font-medium",
              i <= step ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-bold",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground")}>
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

const inputCls = (error?: string) =>
  cn("w-full rounded-2xl border bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60",
    error ? "border-destructive" : "border-border");

function CheckRow({ checked, onChange, error, children }: { checked: boolean; onChange: (v: boolean) => void; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface")}>
          {checked && <Check className="size-3.5" />}
        </span>
        <span className="text-sm text-muted-foreground">{children}</span>
      </button>
      {error && <p className="mt-1.5 pl-8 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function VerifyCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
      <div className="mt-3 text-sm font-bold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function ReviewRow({ label, value, copy, success }: { label: string; value: string; copy?: string; success?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-right font-semibold", success ? "text-success" : "text-foreground")}>
        {value}
        {copy && (
          <button type="button" onClick={() => { navigator.clipboard?.writeText(copy); toast.success("Copied"); }}
            className="text-muted-foreground hover:text-foreground" aria-label="Copy">
            <Copy className="size-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

type TLItem = { label: string; status: "complete" | "staging" | "pending"; note?: string };
export function Timeline({ items, className }: { items: TLItem[]; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-6 shadow-soft", className)}>
      <h3 className="mb-4 font-display text-base font-bold text-foreground">Progress</h3>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={it.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("grid size-6 place-items-center rounded-full text-[10px] font-bold",
                it.status === "complete" ? "bg-success text-success-foreground"
                  : it.status === "staging" ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface text-muted-foreground")}>
                {it.status === "complete" ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < items.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <div className="text-sm font-semibold text-foreground">{it.label}</div>
              <div className="text-xs text-muted-foreground">
                {it.status === "complete" ? "Complete" : it.status === "staging" ? "Staging" : it.note ?? "Pending"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
