import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardPaste, Copy, Info,
  Loader2, QrCode, AlertTriangle, Clock,
} from "lucide-react";
import { CheckoutHeader } from "@/routes/buy";
import { SwapWidget, type SwapState } from "@/components/exchange/SwapWidget";
import { ExchangeLoader } from "@/components/exchange/ExchangeLoader";
import { CryptoIcon } from "@/components/CryptoIcon";
import { CustomSelect, type SelectOption } from "@/components/paycrivo/CustomSelect";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import {
  defaultExchange, loadExchangeDraft, saveExchangeDraft, clearExchangeDraft,
  networksForAsset, generateExchangeOrderId, saveExchangeOrder, depositAddress,
  type ExchangeState,
} from "@/lib/exchange";
import { useExchangeQuote, needsDestinationTag } from "@/services/exchangeQuote";
import { formatUtcTime } from "@/services/priceService";
import { validateWallet, detectAddressKind } from "@/utils/walletValidation";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exchange/checkout")({
  head: () => ({ meta: [{ title: "Exchange checkout — PayCrivo" }] }),
  component: ExchangeCheckout,
});

const STEPS = ["Pair", "Email", "Receiving wallet", "Send crypto", "Review"];
const REVIEW = STEPS.length - 1; // 4
const STEP_LOADER = [
  "Checking live rate…",
  "Saving your email…",
  "Validating receiving network…",
  "Generating deposit address…",
];
const RESERVE_MS = 15 * 60 * 1000;

function ExchangeCheckout() {
  const navigate = useNavigate();
  const [state, setState] = useState<ExchangeState>(() => loadExchangeDraft() ?? defaultExchange);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loader, setLoader] = useState<string | null>(null);
  const [checkingDeposit, setCheckingDeposit] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ExchangeState>(key: K, value: ExchangeState[K]) =>
    setState((s) => ({ ...s, [key]: value }));
  const patch = (p: Partial<ExchangeState>) => setState((s) => ({ ...s, ...p }));

  useEffect(() => { saveExchangeDraft(state); }, [state]);
  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [state.step]);

  const sendAsset = getAsset(state.sendCoin)!;
  const receiveAsset = getAsset(state.receiveCoin)!;
  const quote = useExchangeQuote(state.sendAmount, state.sendCoin, state.receiveCoin);

  const receiveNetworks = networksForAsset(state.receiveCoin);
  const receiveNetOpts: SelectOption[] = receiveNetworks.map((n) => ({ value: n, label: n }));
  const walletCheck = useMemo(() => validateWallet(state.wallet, state.receiveNetwork), [state.wallet, state.receiveNetwork]);
  const pastedKind = detectAddressKind(state.wallet);
  const networkMismatch =
    state.wallet.trim().length > 4 && !walletCheck.valid && pastedKind
      ? `You pasted a ${pastedKind} address, but ${state.receiveNetwork} is selected.`
      : null;
  const tag = needsDestinationTag(state.receiveCoin, state.receiveNetwork);
  const deposit = useMemo(() => depositAddress(state.sendCoin, state.sendNetwork), [state.sendCoin, state.sendNetwork]);

  const swapState: SwapState = {
    sendAmount: state.sendAmount, sendCoin: state.sendCoin, sendNetwork: state.sendNetwork,
    receiveCoin: state.receiveCoin, receiveNetwork: state.receiveNetwork,
  };

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      const amt = parseFloat(state.sendAmount);
      if (!state.sendAmount || !amt || amt <= 0) e.sendAmount = "Enter an amount greater than 0.";
      if (state.sendCoin === state.receiveCoin) e.pair = "Choose two different assets to exchange.";
      if (!state.sendNetwork) e.sendNetwork = "Select a network.";
      if (!state.receiveNetwork) e.receiveNetwork = "Select a network.";
    }
    if (step === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = "Enter a valid email address.";
      if (!state.agreeTerms) e.agreeTerms = "Please accept the terms to continue.";
    }
    if (step === 2) {
      if (!state.receiveNetwork) e.receiveNetwork = "Select a network.";
      if (!walletCheck.valid) e.wallet = walletCheck.error ?? "Enter a valid wallet address.";
      if (!state.networkRiskAck) e.networkRiskAck = "Please confirm you understand the network risk.";
    }
    if (step === 3) {
      if (!state.depositConfirmed) e.deposit = "Confirm you have sent the crypto to continue.";
    }
    if (step === REVIEW) {
      if (!state.riskAck) e.riskAck = "Please acknowledge to confirm.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(state.step)) return;
    const label = STEP_LOADER[state.step] ?? "Loading…";
    setLoader(label);
    window.setTimeout(() => {
      setLoader(null);
      setState((s) => {
        const target = Math.min(s.step + 1, REVIEW);
        // Reserve the rate when entering the Send crypto step.
        const reservedUntil = target === 3 && !s.reservedUntil ? Date.now() + RESERVE_MS : s.reservedUntil;
        return { ...s, step: target, reservedUntil };
      });
    }, 2200);
  };

  const back = () => { setErrors({}); set("step", Math.max(state.step - 1, 0)); };

  const confirmDeposit = () => {
    setCheckingDeposit(true);
    window.setTimeout(() => {
      setCheckingDeposit(false);
      set("depositConfirmed", true);
      setErrors((e) => ({ ...e, deposit: "" }));
      toast.success("Deposit detected in staging");
    }, 2800);
  };

  const createOrder = () => {
    if (!validateStep(REVIEW)) return;
    setLoader("Creating exchange order…");
    window.setTimeout(() => {
      const id = generateExchangeOrderId();
      saveExchangeOrder({
        id, createdAt: new Date().toISOString(),
        status: state.depositConfirmed ? "Deposit detected" : "Awaiting deposit",
        sendAmount: state.sendAmount, sendCoin: state.sendCoin, sendNetwork: state.sendNetwork,
        receiveCoin: state.receiveCoin, receiveNetwork: state.receiveNetwork,
        receiveEstimate: quote.netReceive, rate: quote.rate,
        wallet: state.wallet, destinationTag: state.destinationTag || undefined,
        email: state.email, depositAddress: deposit, depositConfirmed: state.depositConfirmed,
        reservedUntil: state.reservedUntil,
      });
      clearExchangeDraft();
      setLoader(null);
      navigate({ to: "/exchange/order/$orderId", params: { orderId: id } });
    }, 2400);
  };

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div ref={topRef} />
      <ProgressBar step={state.step} />

      <div className="mx-auto max-w-[600px] px-4 py-8 sm:px-6">
        <button
          onClick={() => (state.step === 0 ? navigate({ to: "/exchange" }) : back())}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {state.step === 0 ? "Back to exchange" : "Back"}
        </button>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-7">
          <div key={state.step} className="animate-step-in">
            {state.step === 0 && (
              <div>
                <SwapWidget state={swapState} onChange={(p) => patch(p)} title="Exchange crypto" className="border-0 p-0 shadow-none" />
                {errors.sendAmount && <p className="mt-2 text-xs font-medium text-destructive">{errors.sendAmount}</p>}
                {errors.pair && <p className="mt-2 text-xs font-medium text-destructive">{errors.pair}</p>}
              </div>
            )}

            {state.step === 1 && (
              <Section title="Where should we send order updates?" subtitle="We'll use this email to show order updates and recovery details.">
                <Field label="Email address" error={errors.email}>
                  <input type="email" value={state.email} onChange={(e) => set("email", e.target.value)}
                    placeholder="you@email.com" className={inputCls(errors.email)} />
                </Field>
                <CheckRow checked={state.agreeTerms} onChange={(v) => set("agreeTerms", v)} error={errors.agreeTerms}>
                  I agree to the Terms, Privacy Policy, and Risk Disclosure.
                </CheckRow>
              </Section>
            )}

            {state.step === 2 && (
              <Section title={`Enter your ${receiveAsset.name} receiving address`} subtitle="Your exchanged crypto will be delivered to this address.">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                  <CryptoIcon symbol={receiveAsset.symbol} color={receiveAsset.iconColor} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{receiveAsset.name}</div>
                    <div className="text-xs text-muted-foreground">{receiveAsset.symbol}</div>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{state.receiveNetwork}</span>
                </div>

                {receiveNetworks.length > 1 && (
                  <Field label="Receive network" error={errors.receiveNetwork}>
                    <CustomSelect options={receiveNetOpts} value={state.receiveNetwork} onChange={(v) => set("receiveNetwork", v)} />
                  </Field>
                )}

                <Field label="Receiving wallet address" error={errors.wallet}>
                  <div className="flex items-center gap-2">
                    <input value={state.wallet} onChange={(e) => set("wallet", e.target.value)}
                      placeholder={`Your ${receiveAsset.symbol} address`}
                      className={inputCls(errors.wallet || (networkMismatch ? "x" : undefined))} />
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

                {networkMismatch && (
                  <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {networkMismatch}
                  </p>
                )}
                {walletCheck.valid && walletCheck.warning && (
                  <p className="flex items-start gap-2 rounded-xl bg-accent/50 px-3 py-2.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" /> {walletCheck.warning}
                  </p>
                )}

                {tag.needs && (
                  <Field label={tag.label}>
                    <input value={state.destinationTag} onChange={(e) => set("destinationTag", e.target.value)}
                      placeholder="Enter tag/memo if your wallet requires one" className={inputCls()} />
                  </Field>
                )}

                <p className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> Make sure the address matches the <span className="font-semibold text-foreground">{state.receiveNetwork}</span> network.
                </p>

                <CheckRow checked={state.networkRiskAck} onChange={(v) => set("networkRiskAck", v)} error={errors.networkRiskAck}>
                  I understand crypto sent to the wrong network may be lost.
                </CheckRow>
              </Section>
            )}

            {state.step === 3 && (
              <SendCryptoStep
                state={state} deposit={deposit} sendAsset={sendAsset}
                checking={checkingDeposit} onConfirm={confirmDeposit} error={errors.deposit}
              />
            )}

            {state.step === REVIEW && (
              <Section title="Review your exchange" subtitle="Confirm the details before creating your order.">
                <div className="space-y-1 rounded-2xl bg-surface p-4 text-sm">
                  <ReviewRow label="You send" value={`${state.sendAmount} ${sendAsset.symbol}`} />
                  <ReviewRow label="Send network" value={state.sendNetwork} />
                  <ReviewRow label="You receive (est.)" value={`${formatTokenAmount(quote.netReceive)} ${receiveAsset.symbol}`} />
                  <ReviewRow label="Receive network" value={state.receiveNetwork} />
                  <ReviewRow label="Receiving wallet" value={`${state.wallet.slice(0, 8)}…${state.wallet.slice(-6)}`} copy={state.wallet} />
                  {state.destinationTag && <ReviewRow label="Tag / memo" value={state.destinationTag} />}
                  <div className="border-t border-border pt-1.5">
                    <ReviewRow label="Exchange rate" value={`1 ${sendAsset.symbol} ≈ ${formatTokenAmount(quote.rate)} ${receiveAsset.symbol}`} />
                    <ReviewRow label="PayCrivo fee" value="0% (first exchange)" />
                    <ReviewRow label="Network fee (est.)" value={`${formatTokenAmount(quote.networkFee)} ${receiveAsset.symbol}`} />
                    <ReviewRow label="Estimated time" value="5–30 min" />
                    <ReviewRow label="Deposit status" value={state.depositConfirmed ? "Detected in staging" : "Awaiting deposit"} success={state.depositConfirmed} />
                  </div>
                </div>
                <CheckRow checked={state.riskAck} onChange={(v) => set("riskAck", v)} error={errors.riskAck}>
                  I understand crypto transactions are irreversible and network selection must be correct.
                </CheckRow>
              </Section>
            )}
          </div>
        </div>

        {/* Summary accordion under the card */}
        <SummaryAccordion state={state} className="mt-4" />

        {/* Footer action */}
        <div className="mt-5">
          {state.step === REVIEW ? (
            <button onClick={createOrder}
              className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
              Create exchange order <ArrowRight className="size-4" />
            </button>
          ) : state.step === 3 ? null : (
            <button onClick={next}
              className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
              Continue <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {loader && <ExchangeLoader label={loader} />}
    </div>
  );
}

/* ---------- Send crypto step ---------- */
function SendCryptoStep({
  state, deposit, sendAsset, checking, onConfirm, error,
}: {
  state: ExchangeState;
  deposit: string;
  sendAsset: ReturnType<typeof getAsset>;
  checking: boolean;
  onConfirm: () => void;
  error?: string;
}) {
  return (
    <Section title="Send your crypto" subtitle="Send the exact amount to the PayCrivo deposit address below.">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">You send</span>
          <span className="font-bold text-foreground">{state.sendAmount} {sendAsset!.symbol}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Send network</span>
          <span className="font-semibold text-foreground">{state.sendNetwork}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PayCrivo deposit address</div>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-xl bg-surface px-3 py-2.5 font-mono text-xs text-foreground">{deposit}</code>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(deposit); toast.success("Copied"); }}
            className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:text-foreground" aria-label="Copy deposit address">
            <Copy className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid size-28 place-items-center rounded-xl border border-border bg-surface">
          <QrCode className="size-16 text-foreground/80" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Prototype deposit address for staging.</p>
      </div>

      <RateTimer until={state.reservedUntil} />

      <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
        state.depositConfirmed ? "bg-success/10 text-success" : "bg-accent/40 text-accent-foreground")}>
        {state.depositConfirmed ? <Check className="size-4" /> : <Loader2 className={cn("size-4", checking && "animate-spin")} />}
        {state.depositConfirmed ? "Deposit detected in staging" : checking ? "Checking network…" : "Waiting for deposit"}
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        {!state.depositConfirmed ? (
          <button onClick={onConfirm} disabled={checking}
            className="bg-gradient-primary flex-1 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-50">
            {checking ? "Checking…" : "I have sent the crypto"}
          </button>
        ) : (
          <span className="flex-1 rounded-2xl bg-success/10 py-3.5 text-center text-sm font-bold text-success">Ready to continue</span>
        )}
      </div>

      {state.depositConfirmed && <ContinueAfterDeposit />}
    </Section>
  );
}

// Continue button shown after deposit detected — triggers the standard step advance.
function ContinueAfterDeposit() {
  return (
    <p className="text-center text-xs text-muted-foreground">Use “Continue” below to review your exchange.</p>
  );
}

function RateTimer({ until }: { until: number }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const remaining = Math.max(0, until - now);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      <Clock className="size-4 text-primary" />
      <span className="text-muted-foreground">Rate reserved for</span>
      <span className="font-mono font-bold text-foreground">{hydrated ? `${mm}:${ss}` : "15:00"}</span>
    </div>
  );
}

/* ---------- Summary accordion ---------- */
function SummaryAccordion({ state, className }: { state: ExchangeState; className?: string }) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const sendAsset = getAsset(state.sendCoin)!;
  const receiveAsset = getAsset(state.receiveCoin)!;
  const quote = useExchangeQuote(state.sendAmount, state.sendCoin, state.receiveCoin);
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-soft", className)}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3.5 text-left">
        <div className="flex items-center -space-x-2">
          <CryptoIcon symbol={sendAsset.symbol} color={sendAsset.iconColor} size={28} />
          <CryptoIcon symbol={receiveAsset.symbol} color={receiveAsset.iconColor} size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">{formatTokenAmount(quote.netReceive)} {receiveAsset.symbol}</div>
          <div className="text-xs text-muted-foreground">Send {state.sendAmount} {sendAsset.symbol}</div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-4 text-sm">
          <SRow label="You send" value={`${state.sendAmount} ${sendAsset.symbol}`} />
          <SRow label="Send network" value={state.sendNetwork} />
          <SRow label="You receive (est.)" value={`${formatTokenAmount(quote.netReceive)} ${receiveAsset.symbol}`} />
          <SRow label="Receive network" value={state.receiveNetwork} />
          {state.wallet && <SRow label="Receiving wallet" value={`${state.wallet.slice(0, 6)}…${state.wallet.slice(-4)}`} />}
          <SRow label="Exchange rate" value={`1 ${sendAsset.symbol} ≈ ${formatTokenAmount(quote.rate)} ${receiveAsset.symbol}`} />
          <SRow label="PayCrivo fee" value="0% (first exchange)" />
          <SRow label="Network fee (est.)" value={`${formatTokenAmount(quote.networkFee)} ${receiveAsset.symbol}`} />
          <div className="border-t border-border pt-2 text-xs text-muted-foreground">
            {quote.status === "live" ? "Live price" : "Price estimate"}{hydrated ? ` · updated ${formatUtcTime(quote.lastUpdated)}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- shared pieces ---------- */
function ProgressBar({ step }: { step: number }) {
  const pct = ((step + 1) / STEPS.length) * 100;
  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-[600px] px-4 py-3 sm:px-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className="text-foreground">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
          <span className="text-muted-foreground">{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="bg-gradient-primary h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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

function SRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
