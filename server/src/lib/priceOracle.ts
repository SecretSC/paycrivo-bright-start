// Server-side price/FX oracle. All order pricing MUST go through this so the
// browser never picks the numbers. Cached in-memory, refreshed lazily.

import { FALLBACK_FX, FALLBACK_PRICE_USD, SUPPORTED_ASSETS, SUPPORTED_FIATS } from "./catalog.js";

const PRICE_TTL_MS = 30_000;
const FX_TTL_MS = 300_000;

export type FetchLike = (input: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

let priceFetch: FetchLike = (globalThis as unknown as { fetch: FetchLike }).fetch;
let fxFetch: FetchLike = (globalThis as unknown as { fetch: FetchLike }).fetch;

export function __setPriceFetch(fn: FetchLike) { priceFetch = fn; }
export function __setFxFetch(fn: FetchLike) { fxFetch = fn; }

type PriceSnap = { prices: Record<string, number>; status: "live" | "estimate"; ts: number };
type FxSnap = { rates: Record<string, number>; status: "live" | "estimate"; ts: number };

let priceCache: PriceSnap | null = null;
let fxCache: FxSnap | null = null;

export function __resetOracle() { priceCache = null; fxCache = null; }

const CG_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple",
  USDT: "tether", USDC: "usd-coin", BNB: "binancecoin", DOGE: "dogecoin",
  TRX: "tron", ADA: "cardano", LTC: "litecoin", AVAX: "avalanche-2",
  LINK: "chainlink", DOT: "polkadot", POL: "polygon-ecosystem-token",
  BCH: "bitcoin-cash", XLM: "stellar", SHIB: "shiba-inu",
};

export async function getPriceUsd(symbol: string, timeoutMs = 4000): Promise<{ price: number; status: "live" | "estimate" }> {
  if (!SUPPORTED_ASSETS.includes(symbol)) return { price: 0, status: "estimate" };
  const now = Date.now();
  if (priceCache && now - priceCache.ts < PRICE_TTL_MS) {
    const p = priceCache.prices[symbol];
    if (typeof p === "number" && p > 0) return { price: p, status: priceCache.status };
  }
  try {
    const ids = SUPPORTED_ASSETS.map((s) => CG_IDS[s]).filter(Boolean).join(",");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    let json: unknown;
    try {
      const res = await priceFetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: controller.signal },
      );
      if (!res.ok) throw new Error(`http ${res.status}`);
      json = await res.json();
    } finally {
      clearTimeout(t);
    }
    const rec = json as Record<string, { usd?: number }>;
    const prices: Record<string, number> = {};
    for (const [sym, id] of Object.entries(CG_IDS)) {
      const v = rec?.[id]?.usd;
      if (typeof v === "number" && v > 0) prices[sym] = v;
    }
    if (Object.keys(prices).length > 0) {
      priceCache = { prices, status: "live", ts: now };
      const p = prices[symbol];
      if (typeof p === "number" && p > 0) return { price: p, status: "live" };
    }
    throw new Error("no live prices");
  } catch {
    const fallback = FALLBACK_PRICE_USD[symbol];
    if (typeof fallback === "number" && fallback > 0) return { price: fallback, status: "estimate" };
    return { price: 0, status: "estimate" };
  }
}

export async function getFxRate(fiat: string, timeoutMs = 4000): Promise<{ rate: number; status: "live" | "estimate" }> {
  if (!SUPPORTED_FIATS.includes(fiat as (typeof SUPPORTED_FIATS)[number])) {
    return { rate: 0, status: "estimate" };
  }
  if (fiat === "USD") return { rate: 1, status: "live" };
  const now = Date.now();
  if (fxCache && now - fxCache.ts < FX_TTL_MS) {
    const r = fxCache.rates[fiat];
    if (typeof r === "number" && r > 0) return { rate: r, status: fxCache.status };
  }
  try {
    const targets = SUPPORTED_FIATS.filter((c) => c !== "USD").join(",");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    let json: unknown;
    try {
      const res = await fxFetch(`https://api.frankfurter.app/latest?from=USD&to=${targets}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`http ${res.status}`);
      json = await res.json();
    } finally {
      clearTimeout(t);
    }
    const data = json as { rates?: Record<string, number> };
    const rates: Record<string, number> = { USD: 1 };
    for (const [code, rate] of Object.entries(data.rates ?? {})) {
      if (typeof rate === "number" && rate > 0) rates[code] = rate;
    }
    if (Object.keys(rates).length > 1) {
      fxCache = { rates, status: "live", ts: now };
      const r = rates[fiat];
      if (typeof r === "number" && r > 0) return { rate: r, status: "live" };
    }
    throw new Error("no live fx");
  } catch {
    const fb = FALLBACK_FX[fiat];
    if (typeof fb === "number" && fb > 0) return { rate: fb, status: "estimate" };
    return { rate: 0, status: "estimate" };
  }
}