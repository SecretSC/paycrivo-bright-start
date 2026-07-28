// Shared PayCrivo calculation module.
//
// This is the SINGLE authoritative source for order math. Both the browser
// (via src/lib/checkout.ts re-exports) AND the backend (server/src/lib/calc.ts
// re-exports) import from here so the frontend cannot invent a fee model the
// server does not know about. Everything below is pure, has no runtime
// dependencies, and MUST stay serializable & deterministic.
//
// SECURITY NOTE: The browser must never submit `receive`, `total`, `fees`,
// `priceFiat`, or `rate` to the server as authoritative. The server accepts
// only the customer's minimum selections (spend, fiat, asset, network,
// paymentMethod) plus a server-issued `quoteId`, and re-runs `computeQuote`
// against server-controlled price+fee inputs before persisting the order.

export const NETWORK_FEE_USD = 1.99 as const;
export const SERVICE_FEE_RATE = 0.01 as const;   // 1%
export const PAYCRIVO_FEE_RATE = 0.005 as const; // 0.5%
export const MIN_USD = 30 as const;
export const MAX_USD = 10_000 as const;
// A quote is valid for this long after creation. After expiry the browser
// must request a fresh quote and the customer must re-confirm.
export const QUOTE_TTL_MS = 90_000 as const; // 90 seconds

export type PriceStatus = "live" | "estimate";

export type FeeBreakdown = {
  amount: number;
  serviceFee: number;
  networkFee: number;
  paycrivoFee: number;
  discount: number;
  firstPurchase: boolean;
  totalFees: number;
  net: number;
  receive: number;
  total: number;
};

export type QuoteInput = {
  /** Minimum browser-submitted selections. */
  spend: number;              // amount in fiat
  fiat: string;               // 3-letter fiat code (uppercase)
  asset: string;              // asset symbol (uppercase)
  network: string;            // supported network id / label
  paymentMethod: string;      // paymentMethod id
  firstPurchase?: boolean;    // defaults true; backend may override
};

export type QuoteConfig = {
  /** Live USD price for the asset. Non-finite / ≤0 signals "unpriced". */
  priceUsd: number;
  /** Live fiat rate (USD -> fiat). Non-finite / ≤0 signals "no rate". */
  fxRate: number;
  priceStatus: PriceStatus;
  fxStatus: PriceStatus;
  /** Server-controlled catalog gates. */
  supportedFiats: readonly string[];
  supportedAssets: readonly string[];
  networksForAsset: (asset: string) => readonly string[];
  paymentMethodsForFiat: (fiat: string) => readonly string[];
  /** Optional overrides to test alternate fee configs; defaults from constants. */
  networkFeeUsd?: number;
  serviceFeeRate?: number;
  paycrivoFeeRate?: number;
  minUsd?: number;
  maxUsd?: number;
};

export type ComputedQuote = {
  ok: true;
  input: QuoteInput & { firstPurchase: boolean };
  fees: FeeBreakdown;
  priceUsd: number;
  priceFiat: number;
  fxRate: number;
  status: PriceStatus;
  networkFeeFiat: number;
};

export type QuoteError = {
  ok: false;
  code:
    | "invalid_spend"
    | "spend_below_min"
    | "spend_above_max"
    | "unsupported_fiat"
    | "unsupported_asset"
    | "unsupported_network"
    | "invalid_asset_network"
    | "unsupported_payment_method"
    | "no_live_price"
    | "no_fx_rate";
  message: string;
};

export type QuoteResult = ComputedQuote | QuoteError;

function finitePos(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/**
 * Pure fee math. Never returns NaN/Infinity/negatives. If `priceFiat` is
 * provided as 0 / non-finite the receive is 0 (no silent fallback to a stale
 * mock — that would mislead the customer).
 */
export function computeFees(
  amount: number,
  priceFiat: number,
  firstPurchase: boolean,
  opts?: {
    networkFeeFiat?: number;
    serviceFeeRate?: number;
    paycrivoFeeRate?: number;
  },
): FeeBreakdown {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const svcRate = opts?.serviceFeeRate ?? SERVICE_FEE_RATE;
  const pcRate = opts?.paycrivoFeeRate ?? PAYCRIVO_FEE_RATE;
  const networkFee = opts?.networkFeeFiat ?? NETWORK_FEE_USD;

  const serviceFee = firstPurchase ? 0 : safe * svcRate;
  const paycrivoFee = firstPurchase ? 0 : safe * pcRate;
  const discount = 0;
  const totalFees = serviceFee + networkFee + paycrivoFee;
  const net = Math.max(safe - totalFees, 0);

  const unitPrice = finitePos(priceFiat) ? priceFiat : 0;
  const receive = unitPrice > 0 ? net / unitPrice : 0;

  return {
    amount: safe,
    serviceFee,
    networkFee,
    paycrivoFee,
    discount,
    firstPurchase,
    totalFees,
    net,
    receive,
    total: safe,
  };
}

/** Full server-authoritative quote validation + computation. */
export function computeQuote(input: QuoteInput, cfg: QuoteConfig): QuoteResult {
  const firstPurchase = input.firstPurchase ?? true;
  const minUsd = cfg.minUsd ?? MIN_USD;
  const maxUsd = cfg.maxUsd ?? MAX_USD;

  if (!Number.isFinite(input.spend) || input.spend <= 0) {
    return { ok: false, code: "invalid_spend", message: "Spend amount must be a positive number." };
  }
  if (!cfg.supportedFiats.includes(input.fiat)) {
    return { ok: false, code: "unsupported_fiat", message: `Fiat ${input.fiat} is not supported.` };
  }
  if (!cfg.supportedAssets.includes(input.asset)) {
    return { ok: false, code: "unsupported_asset", message: `Asset ${input.asset} is not supported.` };
  }
  const allowedNetworks = cfg.networksForAsset(input.asset);
  if (!allowedNetworks.length) {
    return { ok: false, code: "invalid_asset_network", message: "Asset has no supported networks." };
  }
  if (!allowedNetworks.includes(input.network)) {
    return { ok: false, code: "unsupported_network", message: `Network ${input.network} is not valid for ${input.asset}.` };
  }
  const allowedMethods = cfg.paymentMethodsForFiat(input.fiat);
  if (!allowedMethods.includes(input.paymentMethod)) {
    return { ok: false, code: "unsupported_payment_method", message: `Payment method ${input.paymentMethod} not available for ${input.fiat}.` };
  }
  if (!finitePos(cfg.priceUsd)) {
    return { ok: false, code: "no_live_price", message: "Live price unavailable for this asset." };
  }
  if (!finitePos(cfg.fxRate)) {
    return { ok: false, code: "no_fx_rate", message: `No FX rate available for ${input.fiat}.` };
  }

  // Bound spend in USD equivalents so DKK/JPY etc. don't sneak past MIN/MAX.
  const usdEquivalent = input.spend / cfg.fxRate;
  if (usdEquivalent < minUsd) {
    return { ok: false, code: "spend_below_min", message: `Minimum purchase is $${minUsd} USD.` };
  }
  if (usdEquivalent > maxUsd) {
    return { ok: false, code: "spend_above_max", message: `Maximum purchase is $${maxUsd} USD.` };
  }

  const priceFiat = cfg.priceUsd * cfg.fxRate;
  const networkFeeFiat = (cfg.networkFeeUsd ?? NETWORK_FEE_USD) * cfg.fxRate;
  const fees = computeFees(input.spend, priceFiat, firstPurchase, {
    networkFeeFiat,
    serviceFeeRate: cfg.serviceFeeRate,
    paycrivoFeeRate: cfg.paycrivoFeeRate,
  });
  const status: PriceStatus = cfg.priceStatus === "live" && cfg.fxStatus === "live" ? "live" : "estimate";

  return {
    ok: true,
    input: { ...input, firstPurchase },
    fees,
    priceUsd: cfg.priceUsd,
    priceFiat,
    fxRate: cfg.fxRate,
    status,
    networkFeeFiat,
  };
}