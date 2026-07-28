// Server-authoritative catalog of supported fiats, assets, networks and
// payment methods. Kept in the backend so the browser cannot expand it.
// Structure intentionally mirrors src/data — real deployments should feed
// this from an admin-managed settings table.

export const SUPPORTED_FIATS = [
  "USD","EUR","GBP","DKK","NOK","SEK","CAD","AUD","CHF","PLN",
  "AED","TRY","BRL","MXN","JPY","INR",
] as const;

type AssetSpec = { symbol: string; networks: readonly string[] };

const ASSETS: readonly AssetSpec[] = [
  { symbol: "BTC",   networks: ["Bitcoin"] },
  { symbol: "ETH",   networks: ["Ethereum/ERC20"] },
  { symbol: "SOL",   networks: ["Solana"] },
  { symbol: "XRP",   networks: ["XRP Ledger"] },
  { symbol: "USDT",  networks: ["Ethereum/ERC20","Tron/TRC20","BNB Smart Chain/BEP20","Solana"] },
  { symbol: "USDC",  networks: ["Ethereum/ERC20","Solana","Polygon","BNB Smart Chain"] },
  { symbol: "BNB",   networks: ["BNB Smart Chain/BEP20"] },
  { symbol: "DOGE",  networks: ["Dogecoin"] },
  { symbol: "TRX",   networks: ["Tron/TRC20"] },
  { symbol: "ADA",   networks: ["Cardano"] },
  { symbol: "LTC",   networks: ["Litecoin"] },
  { symbol: "AVAX",  networks: ["Avalanche C-Chain"] },
  { symbol: "LINK",  networks: ["Ethereum/ERC20"] },
  { symbol: "DOT",   networks: ["Polkadot"] },
  { symbol: "POL",   networks: ["Polygon"] },
  { symbol: "BCH",   networks: ["Bitcoin Cash"] },
  { symbol: "XLM",   networks: ["Stellar"] },
  { symbol: "SHIB",  networks: ["Ethereum/ERC20"] },
];

export const SUPPORTED_ASSETS = ASSETS.map((a) => a.symbol);

export function networksForAsset(symbol: string): readonly string[] {
  const a = ASSETS.find((x) => x.symbol === symbol);
  return a ? a.networks : [];
}

const PAYMENT_METHODS_BY_FIAT: Record<string, readonly string[]> = {
  DKK: ["card","apple","google","bank","trustly","mobilepay"],
  EUR: ["card","apple","google","sepa","bank","trustly"],
  USD: ["card","apple","google","bank","ach","wire"],
  GBP: ["card","apple","google","bank","faster","trustly"],
  BRL: ["card","apple","google","pix","bank"],
  SEK: ["card","apple","google","bank","trustly"],
  NOK: ["card","apple","google","bank","trustly"],
};
const FALLBACK_METHODS = ["card","apple","google","bank"] as const;

export function paymentMethodsForFiat(fiat: string): readonly string[] {
  return PAYMENT_METHODS_BY_FIAT[fiat] ?? FALLBACK_METHODS;
}

export const FALLBACK_FX: Readonly<Record<string, number>> = {
  USD: 1, EUR: 0.92, GBP: 0.79, DKK: 6.87, NOK: 10.6, SEK: 10.5,
  CAD: 1.36, AUD: 1.51, CHF: 0.9, PLN: 3.95, AED: 3.67, TRY: 32.5,
  BRL: 5.1, MXN: 17.2, JPY: 157, INR: 83.3,
};

export const FALLBACK_PRICE_USD: Readonly<Record<string, number>> = {
  BTC: 59000, ETH: 1550, SOL: 70, XRP: 1.03, USDT: 1, USDC: 1, BNB: 585,
  DOGE: 0.07, TRX: 0.32, ADA: 0.16, LTC: 65, AVAX: 13, LINK: 11, DOT: 2.8,
  POL: 0.18, BCH: 480, XLM: 0.18, SHIB: 0.000008,
};