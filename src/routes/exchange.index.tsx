import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShieldCheck, Repeat, Wallet, Network, Layers, Lock, CheckCircle2,
  ArrowRight, Wand2, FileCheck2, Send, ChevronDown,
} from "lucide-react";
import { PromoBar } from "@/components/paycrivo/PromoBar";
import { Header } from "@/components/paycrivo/Header";
import { Footer } from "@/components/paycrivo/Footer";
import { SupportedCrypto } from "@/components/paycrivo/SupportedCrypto";
import { SwapWidget, type SwapState } from "@/components/exchange/SwapWidget";
import { UnfinishedExchangeBanner } from "@/components/exchange/UnfinishedExchangeBanner";
import { CryptoIcon } from "@/components/CryptoIcon";
import { useTheme } from "@/hooks/use-theme";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import { usePrices } from "@/services/priceService";
import { networksForAsset, loadExchangeDraft, saveExchangeDraft, defaultExchange } from "@/lib/exchange";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exchange/")({
  head: () => ({
    meta: [
      { title: "Exchange crypto instantly — PayCrivo" },
      { name: "description", content: "Swap between 250+ digital assets with transparent rates, network-aware wallet checks, and a simple checkout flow." },
      { property: "og:title", content: "PayCrivo Exchange — Swap crypto instantly" },
      { property: "og:description", content: "Crypto-to-crypto swaps with transparent rates and clear network details." },
    ],
  }),
  component: ExchangeLanding,
});

const trustBullets = [
  "No account required for preview",
  "Transparent exchange rate",
  "Network-aware wallet checks",
  "250+ crypto assets",
  "No hidden PayCrivo fee on first exchange",
  "Secure checkout flow",
  "No KYC required",
];

const POPULAR_PAIRS: [string, string][] = [
  ["SOL", "BTC"], ["BTC", "ETH"], ["ETH", "USDT"], ["USDT", "SOL"],
  ["XRP", "BTC"], ["LTC", "BTC"], ["DOGE", "USDT"], ["BNB", "ETH"],
];

function ExchangeLanding() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [state, setState] = useState<SwapState>({
    sendAmount: "1", sendCoin: "SOL", sendNetwork: networksForAsset("SOL")[0],
    receiveCoin: "BTC", receiveNetwork: networksForAsset("BTC")[0],
  });
  const onChange = (patch: Partial<SwapState>) => setState((s) => ({ ...s, ...patch }));

  const startExchange = (override?: Partial<SwapState>) => {
    const base = loadExchangeDraft() ?? defaultExchange;
    const next = { ...state, ...override };
    saveExchangeDraft({
      ...defaultExchange, ...base,
      step: 0,
      sendAmount: next.sendAmount, sendCoin: next.sendCoin, sendNetwork: next.sendNetwork,
      receiveCoin: next.receiveCoin, receiveNetwork: next.receiveNetwork,
    });
    navigate({ to: "/exchange/checkout" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PromoBar />
      <Header theme={theme} onToggleTheme={toggle} />
      <UnfinishedExchangeBanner />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Repeat className="size-3.5 text-primary" /> Crypto-to-crypto exchange
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
                Exchange crypto instantly
              </h1>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                Swap between digital assets with transparent rates, clear network details, and a simple checkout flow.
              </p>
              <ul className="mt-7 grid max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2">
                {trustBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-success" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mx-auto w-full max-w-md">
              <SwapWidget state={state} onChange={onChange} onSubmit={() => startExchange()} submitLabel="Exchange now" />
            </div>
          </div>
        </section>

        {/* How exchange works */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">How exchange works</h2>
            <p className="mt-3 text-muted-foreground">Four simple steps from pair to delivery.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Wand2 className="size-5" />, t: "Choose crypto pair", d: "Pick what you send and what you want to receive." },
              { icon: <Wallet className="size-5" />, t: "Enter receiving wallet", d: "Add the address that should receive your crypto." },
              { icon: <FileCheck2 className="size-5" />, t: "Review exchange", d: "Confirm the rate, network, and estimated amount." },
              { icon: <Send className="size-5" />, t: "Send crypto to complete", d: "Send to the deposit address and track your order." },
            ].map((s, i) => (
              <div key={s.t} className="relative rounded-2xl border border-border bg-card p-5 shadow-soft">
                <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">{s.icon}</div>
                <div className="mt-4 text-xs font-bold uppercase tracking-wider text-primary">Step {i + 1}</div>
                <div className="mt-1 text-base font-bold text-foreground">{s.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular pairs */}
        <section className="bg-card/40 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Popular exchange pairs</h2>
              <p className="mt-3 text-muted-foreground">Live rates, updated continuously.</p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POPULAR_PAIRS.map(([from, to]) => (
                <PairCard key={`${from}-${to}`} from={from} to={to}
                  onExchange={() => startExchange({
                    sendCoin: from, receiveCoin: to,
                    sendNetwork: networksForAsset(from)[0], receiveNetwork: networksForAsset(to)[0],
                    sendAmount: "1",
                  })} />
              ))}
            </div>
          </div>
        </section>

        {/* Why exchange */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Why exchange with PayCrivo</h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <ShieldCheck className="size-5" />, t: "Transparent rates", d: "See the exchange rate and fees before you commit." },
              { icon: <Network className="size-5" />, t: "Network-aware validation", d: "We check that your wallet matches the selected network." },
              { icon: <Lock className="size-5" />, t: "Streamlined swap flow", d: "Identity verification is not part of this prototype exchange flow." },
              { icon: <FileCheck2 className="size-5" />, t: "Clear order tracking", d: "Follow every step from deposit to delivery." },
              { icon: <Layers className="size-5" />, t: "250+ supported assets", d: "Swap across major coins, stablecoins, and more." },
              { icon: <Wallet className="size-5" />, t: "Mobile-friendly checkout", d: "A clean, compact flow that works on any device." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40">
                <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">{c.icon}</div>
                <div className="mt-4 text-base font-bold text-foreground">{c.t}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Supported assets (reused) */}
        <SupportedCrypto />

        {/* FAQ */}
        <ExchangeFaq />

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant">
            <h2 className="font-display text-2xl font-bold text-foreground">Ready to swap?</h2>
            <p className="mt-2 text-muted-foreground">Start an exchange in seconds — no account required for preview.</p>
            <button onClick={() => startExchange()}
              className="bg-gradient-primary mt-6 inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
              Exchange now <ArrowRight className="size-4" />
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PairCard({ from, to, onExchange }: { from: string; to: string; onExchange: () => void }) {
  const snap = usePrices();
  const fromA = getAsset(from)!;
  const toA = getAsset(to)!;
  const fromUsd = snap.prices[from]?.price ?? fromA.mockPriceUsd;
  const toUsd = snap.prices[to]?.price ?? toA.mockPriceUsd;
  const rate = toUsd > 0 ? fromUsd / toUsd : 0;
  const change = snap.prices[from]?.change24h ?? fromA.mockChange24h;
  const up = change >= 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center -space-x-2">
          <CryptoIcon symbol={from} color={fromA.iconColor} size={34} />
          <CryptoIcon symbol={to} color={toA.iconColor} size={34} />
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
          {up ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
      <div className="mt-3 text-sm font-bold text-foreground">{from} → {to}</div>
      <div className="mt-1 text-xs text-muted-foreground">1 {from} ≈ {formatTokenAmount(rate)} {to}</div>
      <button onClick={onExchange}
        className="mt-4 w-full rounded-xl border border-border bg-surface py-2 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary">
        Exchange
      </button>
    </div>
  );
}

const FAQ_ITEMS = [
  { q: "How does crypto exchange work?", a: "You choose a pair, enter your receiving wallet, send the source crypto to the provided deposit address, and PayCrivo delivers the target asset to your wallet." },
  { q: "Do I need an account?", a: "No account is required to preview and start an exchange in this prototype." },
  { q: "Do I need KYC for exchange?", a: "No KYC is required for the exchange flow in this prototype." },
  { q: "How are rates calculated?", a: "Rates are derived from live market prices for both assets, refreshed every 10 seconds, minus any applicable network fee and PayCrivo spread." },
  { q: "What happens if I choose the wrong network?", a: "Sending to the wrong network can result in lost funds. PayCrivo validates your receiving address against the selected network and asks you to confirm network risk before continuing." },
  { q: "Can I track my exchange order?", a: "Yes. Every exchange generates an order with a status timeline you can revisit at any time." },
];

function ExchangeFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Exchange FAQ</h2>
      </div>
      <div className="mt-8 space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <div key={item.q} className="overflow-hidden rounded-2xl border border-border bg-card">
            <button onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="text-sm font-bold text-foreground">{item.q}</span>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
