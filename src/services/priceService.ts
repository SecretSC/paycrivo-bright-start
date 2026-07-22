import { useSyncExternalStore } from "react";
import { cryptoAssets } from "@/data/cryptoAssets";

export type PriceEntry = { price: number; change24h: number };
export type PriceStatus = "live" | "estimate";

type Snapshot = {
  prices: Record<string, PriceEntry>;
  status: PriceStatus;
  lastUpdated: number;
};

const seedPrices: Record<string, PriceEntry> = {};
for (const a of cryptoAssets) {
  seedPrices[a.symbol] = { price: a.mockPriceUsd, change24h: a.mockChange24h };
}

// Static-hosting build: no live crypto price feed. CoinGecko was removed
// because api.coingecko.com is CORS-blocked and rate-limited from the browser.
// We serve the seeded snapshot as an "estimate" — consumers already handle
// the "estimate" status. Fiat FX comes from marketDataService via open.er-api.com.
let snapshot: Snapshot = { prices: seedPrices, status: "estimate", lastUpdated: Date.now() };

const listeners = new Set<() => void>();
// No-op subscription: snapshot never changes at runtime.
function ensureStarted() { /* no live feed */ }

export function getPrice(symbol: string): number {
  return snapshot.prices[symbol]?.price ?? 0;
}
export function getChange24h(symbol: string): number {
  return snapshot.prices[symbol]?.change24h ?? 0;
}

const subscribe = (cb: () => void) => {
  ensureStarted();
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function usePrices() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

export function usePrice(symbol: string): PriceEntry {
  const snap = usePrices();
  return snap.prices[symbol] ?? { price: 0, change24h: 0 };
}

export function formatUtcTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}
