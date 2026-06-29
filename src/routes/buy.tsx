import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, ClipboardPaste, Copy, Info, Loader2, QrCode,
  ScanFace, ShieldCheck, FileCheck2, Eye, Smartphone, Wallet, AlertTriangle, X,
} from "lucide-react";
import { Logo } from "@/components/paycrivo/Logo";
import { AssetPicker } from "@/components/paycrivo/AssetPicker";
import { FiatSelector } from "@/components/paycrivo/FiatSelector";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { PaymentMethodSelector } from "@/components/checkout/PaymentMethodSelector";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import {
  MAX_USD, MIN_USD, clearDraft, computeFees, defaultCheckout, fiatByCode,
  generateOrderId, getPaymentMethod, loadDraft, networksForAsset, saveDraft,
  saveOrder, usdValueOf, type CheckoutState,
} from "@/lib/checkout";
import { CustomSelect, type SelectOption } from "@/components/paycrivo/CustomSelect";
import { validateWallet, detectAddressKind, networkNeedsDestinationTag } from "@/utils/walletValidation";
import {
  countryByName, nameRe, cityRe, validateAge18, validatePhone, validatePostal,
  sanitizePhoneInput,
} from "@/data/countries";
import { usePrices, getPrice, formatUtcTime } from "@/services/priceService";
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

const STEPS = ["Amount", "Email", "Details", "Verification", "Wallet", "Ownership", "Review"];
const REVIEW = STEPS.length - 1; // 6

function BuyFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const priceSnap = usePrices();

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
  const [connecting, setConnecting] = useState(false);
  const [kycPreview, setKycPreview] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof CheckoutState>(key: K, value: CheckoutState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const asset = getAsset(state.coin)!;
  const price = getPrice(state.coin); // re-reads on snapshot change via priceSnap
  void priceSnap;
  const networks = useMemo(() => networksForAsset(state.coin), [state.coin]);

  useEffect(() => {
    if (!networks.includes(state.network)) {
      setState((s) => ({ ...s, network: networks[0], wallet: "", walletOwnership: "none" }));
    }
  }, [networks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (createdId) return;
    saveDraft(state);
  }, [state, createdId]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.step, createdId]);

  const fees = useMemo(
    () => computeFees(parseFloat(state.spend) || 0, asset, true, price),
    [state.spend, asset, price],
  );

  const networkOpts: SelectOption[] = networks.map((n) => ({ value: n, label: n }));

  const walletCheck = useMemo(() => validateWallet(state.wallet, state.network), [state.wallet, state.network]);
  const pastedKind = detectAddressKind(state.wallet);
  const networkMismatch =
    state.wallet.trim().length > 4 && !walletCheck.valid && pastedKind
      ? `You pasted a ${pastedKind} address, but ${state.network} is selected.`
      : null;

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
      if (!nameRe.test(state.firstName.trim())) e.firstName = "Enter a valid first name (letters only, 2+ characters).";
      if (!nameRe.test(state.lastName.trim())) e.lastName = "Enter a valid last name (letters only, 2+ characters).";
      const ageErr = validateAge18(state.dob);
      if (ageErr) e.dob = ageErr;
      if (!state.country) e.country = "Select your country.";
      const phoneErr = validatePhone(state.phone, state.country);
      if (phoneErr) e.phone = phoneErr;
      if (state.address.trim().length < 5) e.address = "Enter your full address (at least 5 characters).";
      if (!cityRe.test(state.city.trim())) e.city = "Enter a valid city name.";
      const postalErr = validatePostal(state.postal, state.country);
      if (postalErr) e.postal = postalErr;
      if (!state.detailsConfirmed) e.detailsConfirmed = "Please confirm your details.";
    }
    if (step === 4) {
      if (!state.network) e.network = "Select a network.";
      if (!walletCheck.valid) e.wallet = walletCheck.error ?? "Enter a valid wallet address.";
      if (!state.networkRiskAck) e.networkRiskAck = "Please confirm you understand the network risk.";
    }
    if (step === 5) {
      if (state.walletOwnership === "none") e.ownership = "Confirm wallet ownership or choose manual review.";
    }
    if (step === REVIEW) {
      if (!state.riskAck) e.riskAck = "Please acknowledge to confirm.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(state.step)) return;
    set("step", Math.min(state.step + 1, REVIEW));
  };
  const back = () => {
    setErrors({});
    set("step", Math.max(state.step - 1, 0));
  };

  const onSelectCountry = (name: string) => {
    setState((s) => {
      const c = countryByName(name);
      const digits = s.phone.replace(/\D/g, "");
      const shouldPrefill = !digits;
      return { ...s, country: name, phone: shouldPrefill && c ? `${c.dial} ` : s.phone };
    });
    setErrors((e) => ({ ...e, country: "", phone: "" }));
  };

  const connectWallet = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      set("walletOwnership", "confirmed");
      setErrors((e) => ({ ...e, ownership: "" }));
      toast.success("Wallet ownership confirmed");
    }, 1400);
  };

  const cannotConnect = () => {
    set("walletOwnership", "manual");
    setErrors((e) => ({ ...e, ownership: "" }));
    toast("Marked for manual review");
  };

  const confirmOrder = () => {
    if (!validateStep(REVIEW)) return;
    setConfirming(true);
    setTimeout(() => {
      const id = generateOrderId();
      saveOrder({
        id, createdAt: new Date().toISOString(), status: "Awaiting payment integration",
        spend: state.spend, fiat: state.fiat, coin: state.coin, method: state.method,
        wallet: state.wallet, network: state.network, receive: fees.receive, fees,
        email: state.email, walletOwnership: state.walletOwnership, destinationTag: state.destinationTag,
      });
      clearDraft();
      setConfirming(false);
      setCreatedId(id);
      toast.success("Order created in staging");
    }, 1100);
  };

  if (createdId) return <OrderCreated id={createdId} state={state} price={price} />;

  const fiatInfo = fiatByCode(state.fiat);
  const money = (n: number) => `${fiatInfo.symbol}${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div ref={topRef} />
      <ProgressBar step={state.step} />

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
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
                        inputMode="decimal" value={state.spend}
                        onChange={(e) => set("spend", e.target.value.replace(/[^0-9.]/g, ""))}
                        className="w-full bg-transparent text-2xl font-bold text-foreground outline-none"
                      />
                    </div>
                    <FiatSelector className="w-32 shrink-0" value={state.fiat} onChange={(v) => set("fiat", v)} compact />
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
                  <PaymentMethodSelector value={state.method} onChange={(v) => set("method", v)} />
                </Field>

                <div className="space-y-2 rounded-2xl bg-surface p-4 text-sm">
                  <Row label="Exchange rate" value={`1 ${state.coin} = ${money(price)}`} />
                  <Row label="Service fee (1%)" value={money(fees.serviceFee)} />
                  <Row label="Network fee" value={money(fees.networkFee)} />
                  <Row label="PayCrivo fee" value={money(fees.paycrivoFee)} />
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="font-medium text-success">First purchase discount</span>
                    <span className="font-bold text-success">−{money(fees.discount)}</span>
                  </div>
                </div>
              </Section>
            )}

            {state.step === 1 && (
              <Section title="Continue with your email" subtitle="We'll use this to send your order updates.">
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
              <Section title="Your details" subtitle="To complete purchases, your details may need to match your identity document.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name" error={errors.firstName}>
                    <input value={state.firstName} onChange={(e) => set("firstName", e.target.value.replace(/[0-9]/g, ""))} className={inputCls(errors.firstName)} />
                  </Field>
                  <Field label="Last name" error={errors.lastName}>
                    <input value={state.lastName} onChange={(e) => set("lastName", e.target.value.replace(/[0-9]/g, ""))} className={inputCls(errors.lastName)} />
                  </Field>
                  <Field label="Date of birth" error={errors.dob}>
                    <input type="date" max={new Date().toISOString().slice(0, 10)} value={state.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls(errors.dob)} />
                  </Field>
                  <Field label="Country" error={errors.country}>
                    <CountrySelector value={state.country} onChange={onSelectCountry} error={!!errors.country} />
                  </Field>
                  <Field label="Phone number" error={errors.phone}>
                    <input
                      inputMode="tel" value={state.phone}
                      onChange={(e) => set("phone", sanitizePhoneInput(e.target.value))}
                      placeholder={countryByName(state.country)?.code === "DK" ? "+45 12 34 56 78" : (countryByName(state.country)?.dial ?? "+1") + " 555 000 0000"}
                      className={inputCls(errors.phone)}
                    />
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
              <VerificationStep onPreview={() => setKycPreview(true)} />
            )}

            {state.step === 4 && (
              <Section title={`Enter your ${asset.name} wallet address`} subtitle="Your crypto will be delivered to this address.">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                  <CryptoIcon symbol={asset.symbol} color={asset.iconColor} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{state.network}</span>
                </div>

                <Field label="Network" error={errors.network}>
                  <CustomSelect options={networkOpts} value={state.network} onChange={(v) => set("network", v)} />
                </Field>

                <Field label="Wallet address" error={errors.wallet}>
                  <div className="flex items-center gap-2">
                    <input value={state.wallet} onChange={(e) => set("wallet", e.target.value)}
                      placeholder={`Your ${asset.symbol} address`}
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
                  <p className="-mt-2 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {networkMismatch}
                  </p>
                )}

                {state.wallet.trim() && walletCheck.valid && walletCheck.warning && (
                  <p className="-mt-2 flex items-start gap-2 rounded-xl bg-accent px-3 py-2.5 text-xs font-medium text-accent-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" /> {walletCheck.warning}
                  </p>
                )}

                {networkNeedsDestinationTag(state.network) && (
                  <Field label="Destination tag (optional)">
                    <input value={state.destinationTag} inputMode="numeric"
                      onChange={(e) => set("destinationTag", e.target.value.replace(/\D/g, ""))}
                      placeholder="Only if your exchange requires it" className={inputCls()} />
                  </Field>
                )}

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <ShieldCheck className="size-4 text-primary" /> Network compatibility
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{networkHelp(asset.symbol, state.network)}</p>
                </div>

                <p className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Make sure this address supports the selected asset and network. Crypto sent to the wrong network may be lost.
                </p>

                <CheckRow checked={state.networkRiskAck} onChange={(v) => set("networkRiskAck", v)} error={errors.networkRiskAck}>
                  I understand network risk and have checked this address.
                </CheckRow>
                <CheckRow checked={state.saveWallet} onChange={(v) => set("saveWallet", v)}>
                  Save this wallet for later
                </CheckRow>
              </Section>
            )}

            {state.step === 5 && (
              <Section title="Confirm wallet ownership" subtitle="To help protect your purchase, confirm that you control this wallet.">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={asset.symbol} color={asset.iconColor} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">{asset.name} · {state.network}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {state.wallet ? `${state.wallet.slice(0, 10)}…${state.wallet.slice(-6)}` : "No address"}
                      </div>
                    </div>
                    <OwnershipBadge status={state.walletOwnership} />
                  </div>

                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-card px-3 py-2.5 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    Confirming ownership helps protect against scams and mistaken transfers. We never ask for your seed phrase or private keys.
                  </p>

                  {state.walletOwnership === "confirmed" && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-3 text-sm font-bold text-success">
                      <Check className="size-4" /> Wallet ownership confirmed
                    </div>
                  )}
                  {state.walletOwnership === "manual" && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-3 text-sm font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-4" /> Manual review required
                    </div>
                  )}

                  {state.walletOwnership === "none" && (
                    <div className="mt-4 space-y-3">
                      <button type="button" onClick={connectWallet} disabled={connecting}
                        className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-70">
                        {connecting ? <><Loader2 className="size-4 animate-spin" /> Opening wallet confirmation…</> : <><Wallet className="size-4" /> Connect wallet</>}
                      </button>
                      <button type="button" onClick={cannotConnect}
                        className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                        I cannot connect this wallet
                      </button>
                    </div>
                  )}
                  {errors.ownership && <p className="mt-2 text-xs font-medium text-destructive">{errors.ownership}</p>}
                </div>
              </Section>
            )}

            {state.step === REVIEW && (
              <Section title="Review your order" subtitle="Check everything looks right before confirming.">
                <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
                  <ReviewRow label="You spend" value={`${money(fees.amount)} ${state.fiat}`} />
                  <ReviewRow label="You receive" value={`${formatTokenAmount(fees.receive)} ${asset.symbol}`} />
                  <ReviewRow label="Asset" value={asset.name} />
                  <ReviewRow label="Network" value={state.network} />
                  <ReviewRow label="Wallet" value={`${state.wallet.slice(0, 8)}…${state.wallet.slice(-6)}`} copy={state.wallet} />
                  {state.destinationTag && <ReviewRow label="Destination tag" value={state.destinationTag} />}
                  <ReviewRow label="Wallet ownership" badge={state.walletOwnership} />
                  <ReviewRow label="Verification" value="Staging (Phase 7)" />
                  <ReviewRow label="Payment method" value={getPaymentMethod(state.method).name} />
                  <ReviewRow label="Exchange rate" value={`1 ${state.coin} = ${money(price)}`} />
                  <ReviewRow label="Service fee" value={money(fees.serviceFee)} />
                  <ReviewRow label="Network fee" value={money(fees.networkFee)} />
                  <ReviewRow label="PayCrivo fee" value={money(fees.paycrivoFee)} />
                  <ReviewRow label="First purchase discount" value={`−${money(fees.discount)}`} success />
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-display text-lg font-bold text-foreground">{money(fees.total)} {state.fiat}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>Price updated: {formatUtcTime(priceSnap.lastUpdated)} · {priceSnap.status === "live" ? "Live price" : "Price estimate"}</span>
                  </div>
                </div>
                <p className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" /> Final crypto amount may update before payment confirmation.
                </p>
                <CheckRow checked={state.riskAck} onChange={(v) => set("riskAck", v)} error={errors.riskAck}>
                  I understand crypto transactions may be irreversible and prices can change.
                </CheckRow>
              </Section>
            )}
          </div>

          {/* actions */}
          {state.step !== 5 || state.walletOwnership !== "none" ? (
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              {state.step > 0 && (
                <button onClick={back} className="rounded-2xl border border-border px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                  Back
                </button>
              )}
              {state.step < REVIEW ? (
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
          ) : (
            state.step === 5 && (
              <div className="mt-6">
                <button onClick={back} className="rounded-2xl border border-border px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                  Back
                </button>
              </div>
            )
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
            <ShieldCheck className="size-3.5" /> No real payment is processed in staging.
          </p>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary spend={state.spend} fiat={state.fiat} coin={state.coin} method={state.method}
            network={state.step >= 4 ? state.network : undefined} wallet={state.step >= 4 ? state.wallet : undefined} />
        </aside>
      </div>

      {kycPreview && <KycPreviewModal onClose={() => setKycPreview(false)} />}
    </div>
  );
}

function networkHelp(symbol: string, network: string): string {
  const n = network.toLowerCase();
  if (n.includes("solana")) return "For Solana, addresses are usually 32–44 characters and do not start with 0x.";
  if (n.includes("erc20") || n.includes("bep20") || n.includes("polygon") || n.includes("avalanche")) return "EVM addresses start with 0x followed by 40 hexadecimal characters.";
  if (n.includes("bitcoin")) return "Bitcoin addresses start with bc1, 1, or 3.";
  if (n.includes("xrp")) return "XRP addresses start with r. Some wallets also require a destination tag.";
  if (n.includes("tron")) return "Tron addresses start with T and are 34 characters long.";
  return `Double-check your ${symbol} address matches the ${network} network before continuing.`;
}

/* ---------- Verification step ---------- */
function VerificationStep({ onPreview }: { onPreview: () => void }) {
  const stages = ["Not started", "Document", "Face check", "Review", "Complete"];
  return (
    <Section title="Verify your identity" subtitle="PayCrivo uses identity checks to help protect customers and prevent misuse.">
      <div className="rounded-3xl border border-border bg-gradient-to-b from-surface to-card p-6">
        <div className="flex justify-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-soft">
            <ShieldCheck className="size-8" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <VerifyCard icon={<FileCheck2 className="size-5" />} title="Document scan" desc="Passport, driver license, or national ID" />
          <VerifyCard icon={<ScanFace className="size-5" />} title="Face check" desc="Quick liveness check on your phone" />
          <VerifyCard icon={<Eye className="size-5" />} title="Review" desc="Automatic approval or manual review" />
        </div>

        {/* status bar */}
        <div className="mt-6 flex items-center gap-1.5">
          {stages.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn("h-1.5 w-full rounded-full", i === 0 ? "bg-primary" : "bg-secondary")} />
              <span className="text-center text-[10px] font-medium text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-bold text-foreground">Use your phone to continue verification</div>
          <p className="mt-1 text-xs text-muted-foreground">Scan the code with your phone camera. QR expires in 15 minutes.</p>
          <p className="mt-2 text-xs text-muted-foreground">Full mobile KYC flow will be added in Phase 7.</p>
          <button type="button" onClick={onPreview}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40">
            <Smartphone className="size-4" /> Preview mobile KYC
          </button>
        </div>
        <div className="grid size-32 place-items-center self-center justify-self-center rounded-2xl border border-border bg-surface">
          <QrCode className="size-20 text-foreground/80" />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> This is a staging preview. You can continue without completing verification.
      </p>
    </Section>
  );
}

function KycPreviewModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">Mobile KYC preview</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {/* phone mockup */}
        <div className="mx-auto mt-5 w-48 rounded-[2rem] border-4 border-foreground/80 bg-background p-2 shadow-elegant">
          <div className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-secondary to-card p-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-foreground/30" />
            {/* document frame */}
            <div className="rounded-xl border-2 border-dashed border-primary/60 p-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded bg-primary/30" />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-full rounded bg-foreground/20" />
                  <div className="h-1.5 w-2/3 rounded bg-foreground/20" />
                </div>
              </div>
            </div>
            {/* face circle overlay */}
            <div className="mx-auto mt-4 grid size-20 place-items-center rounded-full border-2 border-primary/70">
              <ScanFace className="size-9 text-primary" />
            </div>
            <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">Look left, then right →</p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Visual preview only. The real camera flow ships in Phase 7.</p>
        <button onClick={onClose} className="bg-gradient-primary mt-4 w-full rounded-2xl py-3 text-sm font-bold text-primary-foreground">
          Close preview
        </button>
      </div>
    </div>
  );
}

function OwnershipBadge({ status }: { status: CheckoutState["walletOwnership"] }) {
  if (status === "confirmed")
    return <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">Confirmed</span>;
  if (status === "manual")
    return <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">Manual review</span>;
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">Not confirmed</span>;
}

/* ---------- Order created ---------- */
function OrderCreated({ id, state, price }: { id: string; state: CheckoutState; price: number }) {
  const asset = getAsset(state.coin)!;
  const fiatInfo = fiatByCode(state.fiat);
  const fees = computeFees(parseFloat(state.spend) || 0, asset, true, price);
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
            <Info2 label="Wallet ownership" value={state.walletOwnership === "confirmed" ? "Confirmed" : state.walletOwnership === "manual" ? "Manual review" : "Not confirmed"} />
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
        <div className="mt-3 hidden items-center justify-between md:flex">
          {STEPS.map((label, i) => (
            <div key={label} className={cn("flex items-center gap-1.5 text-xs font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>
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

function ReviewRow({ label, value, copy, success, badge }: { label: string; value?: string; copy?: string; success?: boolean; badge?: CheckoutState["walletOwnership"] }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      {badge ? (
        <OwnershipBadge status={badge} />
      ) : (
        <span className={cn("flex items-center gap-1.5 text-right font-semibold", success ? "text-success" : "text-foreground")}>
          {value}
          {copy && (
            <button type="button" onClick={() => { navigator.clipboard?.writeText(copy); toast.success("Copied"); }}
              className="text-muted-foreground hover:text-foreground" aria-label="Copy">
              <Copy className="size-3.5" />
            </button>
          )}
        </span>
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
