import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CreditCard, Headphones, Landmark, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { BuyWidget } from "@/components/paycrivo/BuyWidget";
import { PriceChart } from "@/components/paycrivo/PriceChart";
import { HowToBuy } from "@/components/paycrivo/HowToBuy";
import { SupportedCrypto } from "@/components/paycrivo/SupportedCrypto";
import { FAQ } from "@/components/paycrivo/FAQ";
import { UnfinishedOrderBanner } from "@/components/checkout/UnfinishedOrderBanner";
import { RewardBanner } from "@/components/paycrivo/RewardBanner";
import { PAYMENT_METHODS } from "@/data/paymentMethods";
import { PaymentBrandIcon } from "@/components/checkout/PaymentIcons";

export const Route = createFileRoute("/buy-crypto")({
  head: () => ({
    meta: [
      { title: "Buy Crypto with Card or Bank Transfer — PayCrivo" },
      {
        name: "description",
        content:
          "Buy Bitcoin and 250+ cryptocurrencies with a credit card, debit card, or bank transfer. Live rates, transparent fees, and crypto sent straight to your wallet.",
      },
      { property: "og:title", content: "Buy crypto with card or bank transfer — PayCrivo" },
      { property: "og:description", content: "Live rates, transparent fees, and instant checkout with PayCrivo." },
      { property: "og:url", content: "https://paycrivo.com/buy-crypto" },
    ],
    links: [{ rel: "canonical", href: "https://paycrivo.com/buy-crypto" }],
  }),
  component: BuyCryptoLanding,
});

const bullets = [
  { icon: Zap, text: "Instant checkout flow" },
  { icon: Wallet, text: "Buy to your own wallet" },
  { icon: ShieldCheck, text: "Transparent fees" },
  { icon: BadgeCheck, text: "Card & bank transfer" },
  { icon: Headphones, text: "24/7 support" },
  { icon: Sparkles, text: "Beginner-friendly" },
];

function BuyCryptoLanding() {
  return (
    <PageChrome>
      <UnfinishedOrderBanner />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div className="animate-fade-up max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
                <span className="size-2 rounded-full bg-success" /> First purchase: 0% PayCrivo fee
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                Buy crypto with <span className="text-gradient">card or bank transfer</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Live prices, transparent fees, and crypto delivered straight to your own wallet. No hidden costs.
              </p>
              <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {bullets.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Icon className="size-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/buy"
                  search={{ spend: "500", fiat: "USD", coin: "BTC", method: "card" }}
                  className="bg-gradient-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  Buy now <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#buy"
                  className="inline-flex items-center gap-2 rounded-2xl border border-border px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Get a live quote
                </a>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                <BuyWidget />
              </div>
            </div>
          </div>
        </section>

        <RewardBanner />
        <PriceChart />
        <HowToBuy />
        <SupportedCrypto />

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Flexible payment methods</h2>
            <p className="mt-2 text-muted-foreground">
              Pay with a credit or debit card, bank transfer, or your favourite local method.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.values(PAYMENT_METHODS).map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <PaymentBrandIcon icon={m.icon} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/buy"
              search={{ spend: "500", fiat: "USD", coin: "BTC", method: "card" }}
              className="bg-gradient-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5"
            >
              Buy now <ArrowRight className="size-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Landmark className="size-4" /> Card &amp; bank transfer supported
            </span>
          </div>
        </section>

        <FAQ />
      </main>
    </PageChrome>
  );
}

// keep import used in tree-shaking-sensitive builds
void CreditCard;