import { useSyncExternalStore } from "react";
import { cryptoAssets } from "@/data/cryptoAssets";

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", XRP: "ripple", USDT: "tether",
  USDC: "usd-coin", BNB: "binancecoin", DOGE: "dogecoin", TRX: "tron", ADA: "cardano",
  LTC: "litecoin", AVAX: "avalanche-2", LINK: "chainlink", DOT: "polkadot", POL: "polygon-ecosystem-token",
  BCH: "bitcoin-cash", XLM: "stellar", TON: "the-open-network", SHIB: "shiba-inu", UNI: "uniswap",
  ETC: "ethereum-classic", ATOM: "cosmos", NEAR: "near", APT: "aptos", ARB: "arbitrum",
  OP: "optimism", FIL: "filecoin", ICP: "internet-computer", HBAR: "hedera-hashgraph", INJ: "injective-protocol",
  AAVE: "aave", SUI: "sui", TIA: "celestia", KAS: "kaspa", XMR: "monero", RNDR: "render-token",
  FET: "fetch-ai", TAO: "bittensor", PEPE: "pepe", WIF: "dogwifcoin", BONK: "bonk", FTM: "fantom",
};

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

let snapshot: Snapshot = { prices: seedPrices, status: "estimate", lastUpdated: Date.now() };

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function fetchLive(): Promise<void> {
  try {
    const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as Record<string, { usd: number; usd_24h_change?: number }>;
    const nextPrices = { ...snapshot.prices };
    let updated = 0;
    for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
      const row = data[id];
      if (row && typeof row.usd === "number" && row.usd > 0) {
        nextPrices[symbol] = { price: row.usd, change24h: row.usd_24h_change ?? nextPrices[symbol]?.change24h ?? 0 };
        updated++;
      }
    }
    if (updated > 0) {
      snapshot = { prices: nextPrices, status: "live", lastUpdated: Date.now() };
      notify();
    }
  } catch {
    // Keep the realistic fallback snapshot. Status stays "estimate".
  }
}

let started = false;
function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  fetchLive();
  setInterval(fetchLive, 60_000);
}

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
