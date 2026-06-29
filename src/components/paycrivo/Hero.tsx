import { BadgeCheck, Headphones, ShieldCheck, Sparkles, Wallet, Zap } from "lucide-react";
import { BuyWidget } from "./BuyWidget";

const bullets = [
  { icon: Zap, text: "Instant checkout flow" },
  { icon: BadgeCheck, text: "Simple verification" },
  { icon: Wallet, text: "Buy to your own wallet" },
  { icon: ShieldCheck, text: "Transparent fees" },
  { icon: Headphones, text: "24/7 support" },
  { icon: Sparkles, text: "Beginner-friendly" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-up max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            <span className="size-2 rounded-full bg-success" /> Trusted by 1.2M+ customers worldwide
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
            Buy Bitcoin with <span className="text-gradient">Credit Card</span> or Debit Card
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Fast, simple, and secure crypto purchases.
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

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div>
              <span className="block text-2xl font-extrabold text-foreground">$8B+</span>
              traded volume
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-foreground">160+</span>
              countries
            </div>
            <div>
              <span className="block text-2xl font-extrabold text-foreground">4.8/5</span>
              customer rating
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md">
            <BuyWidget />
          </div>
        </div>
      </div>
    </section>
  );
}