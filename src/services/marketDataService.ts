import { useSyncExternalStore } from "react";
import { usePrices, getPrice } from "@/services/priceService";
import { getAsset } from "@/data/cryptoAssets";
import { computeFees, type FeeBreakdown } from "@/lib/checkout";
import { fiats } from "@/lib/paycrivo-data";

// Re-export crypto price helpers so consumers have one import surface.
export { usePrices, getPrice, formatUtcTime } from "@/services/priceService";

export type FxStatus = "live" | "estimate";

// Realistic fallback FX rates (USD -> fiat), used when the live API is down.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, DKK: 6.87, NOK: 10.6, SEK: 10.5,
  CAD: 1.36, AUD: 1.51, CHF: 0.9, PLN: 3.95, AED: 3.67, TRY: 32.5,
  BRL: 5.1, MXN: 17.2, JPY: 157, INR: 83.3,
};

type FxSnapshot = { rates: Record<string, number>; status: FxStatus; lastUpdated: number };

let fxSnap: FxSnapshot = { rates: { ...FALLBACK_RATES }, status: "estimate", lastUpdated: Date.now() };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function fetchFx(): Promise<void> {
  // CORS-friendly public FX endpoint (no key, allows browser calls).
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number>; result?: string };
    if (!data.rates || data.result === "error") throw new Error("no rates");
    const next: Record<string, number> = { USD: 1, ...fxSnap.rates };
    let updated = 0;
    for (const f of fiats) {
      const rate = data.rates[f.code];
      if (typeof rate === "number" && rate > 0) { next[f.code] = rate; updated++; }
    }
    if (updated > 0) {
      fxSnap = { rates: next, status: "live", lastUpdated: Date.now() };
      notify();
    }
  } catch {
    // Keep fallback snapshot. Status stays "estimate".
  }
}

let started = false;
function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  fetchFx();
  setInterval(fetchFx, 60_000);
}

export function getFxRate(fiat: string): number {
  return fxSnap.rates[fiat] ?? FALLBACK_RATES[fiat] ?? 1;
}

const subscribe = (cb: () => void) => {
  ensureStarted();
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useFx(): FxSnapshot {
  return useSyncExternalStore(subscribe, () => fxSnap, () => fxSnap);
}

// Convert a USD value into the selected fiat.
export function convertUsd(usd: number, fiat: string): number {
  return usd * getFxRate(fiat);
}

const NO_DECIMAL = new Set(["JPY"]);

// Format a value already expressed in the target fiat, with the right symbol.
export function formatFiat(amount: number, fiat: string): string {
  const f = fiats.find((x) => x.code === fiat) ?? fiats[0];
  const max = NO_DECIMAL.has(fiat) ? 0 : 2;
  const n = Number.isFinite(amount) ? amount : 0;
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: max, maximumFractionDigits: max });
  return `${f.symbol}${formatted}`;
}

export type Quote = {
  fees: FeeBreakdown;
  priceFiat: number;
  rate: number;
  status: "live" | "estimate";
  lastUpdated: number;
  money: (n: number) => string;
};

const NETWORK_FEE_USD = 1.99;

// Central quote hook: live crypto price (USD) * FX rate -> fiat, FX-aware fees.
export function useQuote(spend: string | number, coin: string, fiat: string): Quote {
  const priceSnap = usePrices();
  const fx = useFx();
  const asset = getAsset(coin)!;
  const priceUsd = priceSnap.prices[coin]?.price ?? asset.mockPriceUsd;
  const rate = fx.rates[fiat] ?? FALLBACK_RATES[fiat] ?? 1;
  const priceFiat = priceUsd * rate;
  const networkFeeFiat = NETWORK_FEE_USD * rate;
  const amount = typeof spend === "number" ? spend : parseFloat(spend) || 0;
  const fees = computeFees(amount, asset, true, priceFiat, networkFeeFiat);
  const status: "live" | "estimate" =
    priceSnap.status === "live" && fx.status === "live" ? "live" : "estimate";
  const lastUpdated = Math.max(priceSnap.lastUpdated, fx.lastUpdated);
  return { fees, priceFiat, rate, status, lastUpdated, money: (n: number) => formatFiat(n, fiat) };
}

// Non-hook variant for places without React context (e.g. saved order recompute).
export function quoteFor(spend: string | number, coin: string, fiat: string): Quote {
  const asset = getAsset(coin)!;
  const priceUsd = getPrice(coin) || asset.mockPriceUsd;
  const rate = getFxRate(fiat);
  const priceFiat = priceUsd * rate;
  const networkFeeFiat = NETWORK_FEE_USD * rate;
  const amount = typeof spend === "number" ? spend : parseFloat(spend) || 0;
  const fees = computeFees(amount, asset, true, priceFiat, networkFeeFiat);
  return {
    fees, priceFiat, rate, status: fxSnap.status === "live" ? "live" : "estimate",
    lastUpdated: fxSnap.lastUpdated, money: (n: number) => formatFiat(n, fiat),
  };
}
