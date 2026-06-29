import { Coins, Eye, Gauge, LifeBuoy, Lock, Wallet } from "lucide-react";

const features = [
  { icon: Gauge, title: "Lightning-fast checkout", body: "Buy crypto in minutes with a streamlined flow built for speed." },
  { icon: Eye, title: "Fully transparent fees", body: "Every fee is shown upfront — exchange rate, service, network and PayCrivo fee." },
  { icon: Lock, title: "Bank-grade security", body: "Encryption, fraud monitoring and segregated infrastructure protect every order." },
  { icon: Wallet, title: "Your keys, your crypto", body: "Assets are delivered to your own wallet. PayCrivo never locks you in." },
  { icon: Coins, title: "18+ cryptocurrencies", body: "From Bitcoin to the latest assets, all in one trusted platform." },
  { icon: LifeBuoy, title: "24/7 human support", body: "Real people, ready to help any time of day, anywhere in the world." },
];

export function WhyChoose() {
  return (
    <section className="bg-gradient-dark relative overflow-hidden py-20 text-white">
      <div className="pointer-events-none absolute -left-20 top-0 size-96 rounded-full bg-primary/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-96 rounded-full bg-primary-glow/20 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80">
            Why PayCrivo
          </span>
          <h2 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl">
            Why users choose PayCrivo
          </h2>
          <p className="mt-3 text-white/70">
            A premium crypto experience built on speed, transparency and trust.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <span className="bg-gradient-primary grid size-12 place-items-center rounded-2xl text-primary-foreground shadow-glow transition-transform group-hover:scale-110">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}