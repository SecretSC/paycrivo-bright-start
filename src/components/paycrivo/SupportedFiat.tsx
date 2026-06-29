import { fiats } from "@/lib/paycrivo-data";

export function SupportedFiat() {
  return (
    <section className="bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">Supported fiat currencies</h2>
          <p className="mt-3 text-muted-foreground">Pay in your local currency — 16 currencies and counting.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {fiats.map((f) => (
            <div
              key={f.code}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40"
            >
              <span className="text-2xl leading-none">{f.flag}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">{f.code}</div>
                <div className="truncate text-xs text-muted-foreground">{f.name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}