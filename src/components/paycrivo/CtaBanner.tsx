import { ArrowRight } from "lucide-react";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="bg-gradient-primary relative overflow-hidden rounded-3xl px-6 py-12 text-center shadow-elegant sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-10 -top-10 size-60 rounded-full bg-white/15 blur-3xl" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-primary-foreground sm:text-4xl">
            Start your first purchase with 0% PayCrivo fee
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Join over 1.2 million people buying crypto the simple, transparent way.
          </p>
          <a
            href="#buy"
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-card px-6 py-3.5 text-base font-bold text-foreground shadow-soft transition-transform hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}