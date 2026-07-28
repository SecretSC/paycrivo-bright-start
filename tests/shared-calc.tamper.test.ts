import { describe, it, expect } from "vitest";
import { computeQuote, type QuoteConfig, type QuoteInput } from "@shared/calc";

// Server-authoritative config used across all tamper tests.
const cfg: QuoteConfig = {
  priceUsd: 59_000,
  fxRate: 1,
  priceStatus: "live",
  fxStatus: "live",
  supportedFiats: ["USD", "EUR", "GBP", "DKK", "NOK", "SEK"] as const,
  supportedAssets: ["BTC", "ETH", "USDT", "SOL", "TRX"] as const,
  networksForAsset: (a) => ({
    BTC: ["Bitcoin"],
    ETH: ["Ethereum/ERC20"],
    USDT: ["Ethereum/ERC20", "Tron/TRC20"],
    SOL: ["Solana"],
    TRX: ["Tron/TRC20"],
  }[a] ?? []),
  paymentMethodsForFiat: (f) => ({
    USD: ["card", "apple", "google", "bank", "ach", "wire"],
    EUR: ["card", "apple", "google", "sepa", "bank", "trustly"],
    DKK: ["card", "apple", "google", "bank", "trustly", "mobilepay"],
    GBP: ["card", "apple", "google", "bank", "faster", "trustly"],
    NOK: ["card", "apple", "google", "bank", "trustly"],
    SEK: ["card", "apple", "google", "bank", "trustly"],
  }[f] ?? ["card"]),
};

const base: QuoteInput = {
  spend: 500, fiat: "USD", asset: "BTC", network: "Bitcoin", paymentMethod: "card",
};

describe("computeQuote — happy path", () => {
  it("canonical $500/BTC first purchase → 0.00844085 BTC", () => {
    const q = computeQuote(base, cfg);
    if (!q.ok) throw new Error("expected ok");
    expect(q.fees.serviceFee).toBe(0);
    expect(q.fees.paycrivoFee).toBe(0);
    expect(q.fees.networkFee).toBeCloseTo(1.99, 8);
    expect(q.fees.net).toBeCloseTo(498.01, 8);
    expect(Number(q.fees.receive.toFixed(8))).toBe(0.00844085);
    expect(q.status).toBe("live");
  });
});

describe("computeQuote — tamper/validation refusals", () => {
  it("rejects invalid spend (NaN)", () => {
    const q = computeQuote({ ...base, spend: NaN }, cfg);
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.code).toBe("invalid_spend");
  });
  it("rejects invalid spend (Infinity)", () => {
    const q = computeQuote({ ...base, spend: Infinity }, cfg);
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.code).toBe("invalid_spend");
  });
  it("rejects invalid spend (negative)", () => {
    const q = computeQuote({ ...base, spend: -100 }, cfg);
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.code).toBe("invalid_spend");
  });
  it("rejects invalid spend (zero)", () => {
    const q = computeQuote({ ...base, spend: 0 }, cfg);
    expect(q.ok).toBe(false);
  });
  it("rejects unsupported fiat", () => {
    const q = computeQuote({ ...base, fiat: "XYZ" }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("unsupported_fiat");
  });
  it("rejects unsupported asset", () => {
    const q = computeQuote({ ...base, asset: "SCAM" }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("unsupported_asset");
  });
  it("rejects unsupported network", () => {
    const q = computeQuote({ ...base, network: "FakeNet" }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("unsupported_network");
  });
  it("rejects invalid asset/network combo (BTC on Solana)", () => {
    const q = computeQuote({ ...base, network: "Solana" }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("unsupported_network");
  });
  it("rejects unsupported payment method", () => {
    const q = computeQuote({ ...base, paymentMethod: "goldbars" }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("unsupported_payment_method");
  });
  it("mobilepay only valid for DKK", () => {
    const bad = computeQuote({ ...base, fiat: "USD", paymentMethod: "mobilepay" }, cfg);
    if (bad.ok) throw new Error("mobilepay should not be valid for USD");
    expect(bad.code).toBe("unsupported_payment_method");
    const good = computeQuote({ ...base, fiat: "DKK", paymentMethod: "mobilepay" }, { ...cfg, fxRate: 6.87 });
    expect(good.ok).toBe(true);
  });
  it("refuses when live price is missing", () => {
    const q = computeQuote(base, { ...cfg, priceUsd: 0 });
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("no_live_price");
  });
  it("refuses when FX rate is missing", () => {
    const q = computeQuote({ ...base, fiat: "EUR" }, { ...cfg, fxRate: 0 });
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("no_fx_rate");
  });
  it("refuses spend below minimum ($30 USD equivalent)", () => {
    const q = computeQuote({ ...base, spend: 10 }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("spend_below_min");
  });
  it("refuses spend above maximum ($10000 USD equivalent)", () => {
    const q = computeQuote({ ...base, spend: 20_000 }, cfg);
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("spend_above_max");
  });
  it("min/max is USD-equivalent (200 DKK is under $30)", () => {
    const q = computeQuote({ ...base, fiat: "DKK", spend: 100 }, { ...cfg, fxRate: 6.87 });
    if (q.ok) throw new Error("expected refusal");
    expect(q.code).toBe("spend_below_min");
  });
  it("status downgrades to 'estimate' when either input is estimate", () => {
    const q1 = computeQuote(base, { ...cfg, priceStatus: "estimate" });
    if (!q1.ok) throw new Error("ok"); expect(q1.status).toBe("estimate");
    const q2 = computeQuote(base, { ...cfg, fxStatus: "estimate" });
    if (!q2.ok) throw new Error("ok"); expect(q2.status).toBe("estimate");
  });
});

describe("computeQuote — fee tampering is impossible (fees derive from inputs)", () => {
  // These tests document why a client cannot bribe cheaper fees: the shape
  // exposes only inputs and the pure fn, no overrides.
  it("first-purchase always zeros service+paycrivo fees, regardless of client wish", () => {
    const q = computeQuote(base, cfg);
    if (!q.ok) throw new Error("ok");
    expect(q.fees.serviceFee).toBe(0);
    expect(q.fees.paycrivoFee).toBe(0);
  });
  it("repeat purchase (firstPurchase: false) applies 1% + 0.5%", () => {
    const q = computeQuote({ ...base, firstPurchase: false }, cfg);
    if (!q.ok) throw new Error("ok");
    expect(q.fees.serviceFee).toBeCloseTo(5, 8);
    expect(q.fees.paycrivoFee).toBeCloseTo(2.5, 8);
  });
  it("network fee scales with FX (denominated in customer's fiat)", () => {
    const q = computeQuote({ ...base, fiat: "DKK", spend: 3435 }, { ...cfg, fxRate: 6.87 });
    if (!q.ok) throw new Error("ok");
    expect(q.fees.networkFee).toBeCloseTo(1.99 * 6.87, 6);
  });
});