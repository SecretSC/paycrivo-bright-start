import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle, ArrowRight, BookOpen, CreditCard, KeyRound, Mail, Network,
  Receipt, Repeat, ShieldCheck, Wallet, XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn Crypto the Simple Way — PayCrivo" },
      {
        name: "description",
        content:
          "Short, beginner-friendly guides to help you buy, swap, and store crypto safely. Learn about networks, wallet addresses, fees, and more.",
      },
      { property: "og:title", content: "Learn crypto the simple way — PayCrivo" },
      {
        property: "og:description",
        content: "Short guides to help you buy, swap, and store crypto with confidence.",
      },
      { property: "og:url", content: "https://paycrivo.com/learn" },
    ],
    links: [{ rel: "canonical", href: "https://paycrivo.com/learn" }],
  }),
  component: LearnPage,
});

type Guide = { icon: LucideIcon; title: string; desc: string };

const guides: Guide[] = [
  { icon: CreditCard, title: "How buying crypto works", desc: "From choosing an asset to delivery in your wallet — the full journey, step by step." },
  { icon: Repeat, title: "How swapping crypto works", desc: "Trade one asset for another with a clear rate and a simple, guided checkout." },
  { icon: Network, title: "Choosing the right network", desc: "Why networks matter and how to pick the correct one for your wallet." },
  { icon: Wallet, title: "Wallet addresses explained", desc: "What a wallet address is, how to copy it safely, and how to avoid errors." },
  { icon: AlertTriangle, title: "Why crypto transactions are irreversible", desc: "Once confirmed on the network, transfers cannot be undone. Here's why it matters." },
  { icon: Receipt, title: "How fees work", desc: "Understand exchange rate, network fees, and service fees before you confirm." },
  { icon: Mail, title: "How email verification protects your order", desc: "A quick one-time code keeps your order and account secure." },
  { icon: XCircle, title: "Common mistakes to avoid", desc: "The small slip-ups that cause lost funds — and how to stay safe." },
];

const faqs = [
  { q: "Do I need an account?", a: "You can get a live quote without an account. To complete a purchase you'll create a free account and verify your email so we can secure your order and send you receipts." },
  { q: "Why do I verify my email?", a: "Email verification confirms you control the address tied to your order. It protects your account and ensures order updates reach you." },
  { q: "Can I cancel a crypto transaction?", a: "Once a transfer is confirmed on the blockchain it cannot be reversed. Always review the asset, network, amount, and wallet address before you confirm." },
  { q: "What happens if I choose the wrong network?", a: "Sending to a wallet on the wrong network can result in lost funds. Double-check that the network you select matches the one your wallet supports for that asset." },
  { q: "Why do prices change?", a: "Crypto markets move continuously, so quoted rates are indicative and refresh regularly. The final price is confirmed at checkout before you approve it." },
  { q: "How long does a swap take?", a: "Most swaps complete within minutes after your deposit is detected, though network congestion can occasionally add some time." },
  { q: "What fees are shown?", a: "Every fee — the exchange rate, network fee, and any service fee — is shown clearly before you confirm. There are no hidden charges." },
];

function LearnPage() {
  return (
    <PageChrome>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
          <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <BookOpen className="size-3.5" /> Beginner-friendly guides
            </span>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl">
              Learn crypto the <span className="text-gradient">simple way</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Short guides to help you buy, swap, and store crypto with confidence.
            </p>
          </div>
        </section>

        {/* Guides */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{desc}</p>
                <Link
                  to="/buy-crypto"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:gap-2.5"
                >
                  Read guide <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Safety */}
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="rounded-3xl border border-primary/30 bg-card p-7 sm:p-10">
            <div className="flex items-start gap-4">
              <span className="bg-gradient-primary grid size-12 shrink-0 place-items-center rounded-2xl text-primary-foreground">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">Stay safe</h2>
                <p className="mt-1 text-sm text-muted-foreground">A few habits that keep your crypto secure.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-5">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  We will never ask for your seed phrase, private keys, or full card details.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Always check the asset, network, and wallet address before confirming.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">Quick answers to common crypto questions.</p>
          </div>
          <Accordion type="single" collapsible className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-border bg-card px-5 shadow-sm transition-colors data-[state=open]:border-primary/40"
              >
                <AccordionTrigger className="py-5 text-left text-base font-bold text-foreground hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
    </PageChrome>
  );
}