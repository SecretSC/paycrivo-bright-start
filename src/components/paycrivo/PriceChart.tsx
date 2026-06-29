import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcon";
import { usePrices } from "@/services/priceService";
import { formatUsd } from "@/data/cryptoAssets";
import { cn } from "@/lib/utils";

const ranges = ["1H", "24H", "1W", "1M", "1Y"] as const;
type Range = (typeof ranges)[number];

// deterministic pseudo-random series per range
function series(range: Range): number[] {
  const counts: Record<Range, number> = { "1H": 24, "24H": 32, "1W": 28, "1M": 30, "1Y": 24 };
  const seedBase: Record<Range, number> = { "1H": 11, "24H": 7, "1W": 23, "1M": 3, "1Y": 17 };
  const n = counts[range];
  let seed = seedBase[range];
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const out: number[] = [];
  let v = 60000 + rand() * 4000;
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.45) * 2600;
    v = Math.max(58000, Math.min(70000, v));
    out.push(v);
  }
  // ensure ending near 67432
  out[out.length - 1] = 67432;
  return out;
}

export function PriceChart() {
  const [range, setRange] = useState<Range>("24H");
  const data = useMemo(() => series(range), [range]);
  const snap = usePrices();
  const btc = snap.prices["BTC"] ?? { price: 59000, change24h: 2.41 };
  const up = btc.change24h >= 0;

  const W = 720;
  const H = 280;
  const pad = 8;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (d - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${H - pad} L${points[0][0].toFixed(1)},${H - pad} Z`;

  const stats = [
    { label: "24h Change", value: `${up ? "+" : ""}${btc.change24h.toFixed(2)}%`, positive: up },
    { label: "Market Cap", value: `$${(btc.price * 19.7e6 / 1e12).toFixed(2)}T` },
    { label: "24h Volume", value: "$38.4B" },
    { label: "24h High", value: `$${formatUsd(btc.price * 1.018)}` },
    { label: "24h Low", value: `$${formatUsd(btc.price * 0.982)}` },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <CryptoIcon symbol="BTC" color="#f7931a" size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-foreground">Bitcoin</h2>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  BTC
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-extrabold text-foreground">${formatUsd(btc.price)}</span>
                <span className={cn("inline-flex items-center gap-0.5 text-sm font-semibold", up ? "text-success" : "text-destructive")}>
                  <ArrowUpRight className={cn("size-4", !up && "rotate-90")} /> {Math.abs(btc.change24h).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  range === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full sm:h-72" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1={pad}
                x2={W - pad}
                y1={pad + (i / 4) * (H - pad * 2)}
                y2={pad + (i / 4) * (H - pad * 2)}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
            <path d={areaPath} fill="url(#chartArea)" />
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={points[points.length - 1][0]}
              cy={points[points.length - 1][1]}
              r="5"
              fill="var(--primary)"
              stroke="var(--card)"
              strokeWidth="2.5"
            />
          </svg>
          {/* axis labels */}
          <div className="mt-2 flex justify-between px-1 text-xs text-muted-foreground">
            {axisLabels(range).map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-surface p-4">
              <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
              <div
                className={cn(
                  "mt-1 text-base font-bold",
                  s.positive ? "text-success" : "text-foreground",
                )}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function axisLabels(range: Range): string[] {
  switch (range) {
    case "1H":
      return ["60m", "45m", "30m", "15m", "now"];
    case "24H":
      return ["00:00", "06:00", "12:00", "18:00", "now"];
    case "1W":
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    case "1M":
      return ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];
    case "1Y":
      return ["Jan", "Apr", "Jul", "Oct", "Now"];
  }
}