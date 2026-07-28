import { describe, it, expect } from "vitest";
import { computeFees } from "@/lib/checkout";
import { getAsset } from "@/data/cryptoAssets";

// PayCrivo fee model (documented):
// - Fees are DEDUCTED from the spend amount (fees taken from the top).
// - On the first purchase: serviceFee=0 and paycrivoFee=0 are waived.
// - networkFee is a flat fiat amount (default 1.99).
// - net = max(spend - totalFees, 0)
// - receive = net / unitPrice (unitPrice defaults to asset.mockPriceUsd)

const BTC = getAsset("BTC")!;
const ETH = getAsset("ETH")!;
const USDT = getAsset("USDT")!;

describe("computeFees — canonical spec example", () => {
  it("spend $500 @ BTC $59000, network $1.99, first purchase → 0.00844085 BTC", () => {
    const q = computeFees(500, BTC, true, 59000, 1.99);
    expect(q.serviceFee).toBe(0);
    expect(q.paycrivoFee).toBe(0);
    expect(q.networkFee).toBeCloseTo(1.99, 8);
    expect(q.totalFees).toBeCloseTo(1.99, 8);
    expect(q.net).toBeCloseTo(498.01, 8);
    expect(q.receive).toBeCloseTo(498.01 / 59000, 10);
    expect(Number(q.receive.toFixed(8))).toBe(0.00844085);
  });
});

describe("computeFees — first vs repeat purchase", () => {
  it("repeat purchase applies 1% service + 0.5% paycrivo", () => {
    const q = computeFees(1000, BTC, false, 50000, 1.99);
    expect(q.serviceFee).toBeCloseTo(10, 8);
    expect(q.paycrivoFee).toBeCloseTo(5, 8);
    expect(q.totalFees).toBeCloseTo(16.99, 8);
    expect(q.net).toBeCloseTo(983.01, 8);
  });
});

describe("computeFees — degenerate inputs never produce NaN/Infinity/negatives", () => {
  const bad = [NaN, Infinity, -Infinity, -50, 0, undefined as unknown as number];
  for (const v of bad) {
    it(`amount=${String(v)} → safe zeros`, () => {
      const q = computeFees(v as number, BTC, true, 59000, 1.99);
      expect(Number.isFinite(q.receive)).toBe(true);
      expect(q.receive).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(q.net)).toBe(true);
      expect(q.net).toBeGreaterThanOrEqual(0);
      expect(q.amount).toBe(0);
    });
  }

  it("zero unit price → receive is 0, not Infinity", () => {
    const q = computeFees(100, BTC, true, 0, 1.99);
    expect(q.receive).toBe(0);
    expect(Number.isFinite(q.receive)).toBe(true);
  });

  it("network fee exceeds spend → net clamps at 0", () => {
    const q = computeFees(1, BTC, true, 59000, 5);
    expect(q.net).toBe(0);
    expect(q.receive).toBe(0);
  });
});

describe("computeFees — multiple assets & prices", () => {
  const cases: Array<[string, number, number]> = [
    ["ETH", 3000, 200],
    ["USDT", 1, 100],
    ["SOL", 150, 250],
  ];
  for (const [sym, price, spend] of cases) {
    it(`${sym} @ ${price} spending ${spend}`, () => {
      const a = getAsset(sym)!;
      const q = computeFees(spend, a, true, price, 1.99);
      expect(q.receive).toBeCloseTo((spend - 1.99) / price, 10);
    });
  }

  it("very low-priced asset (0.0001) yields finite receive", () => {
    const q = computeFees(50, ETH, true, 0.0001, 1.99);
    expect(Number.isFinite(q.receive)).toBe(true);
    expect(q.receive).toBeGreaterThan(0);
  });

  it("very large spend stays finite", () => {
    const q = computeFees(1e9, USDT, true, 1, 1.99);
    expect(Number.isFinite(q.receive)).toBe(true);
    expect(q.receive).toBeCloseTo(1e9 - 1.99, 4);
  });
});

describe("computeFees — fiat-agnostic (networkFee expressed in caller fiat)", () => {
  // BTC priced in fiat by the caller (priceFiat = usdPrice * fxRate).
  const usdBtc = 60000;
  const fxCases: Array<[string, number]> = [
    ["USD", 1],
    ["EUR", 0.92],
    ["GBP", 0.79],
    ["DKK", 6.85],
    ["NOK", 10.5],
    ["SEK", 10.7],
  ];
  for (const [ccy, fx] of fxCases) {
    it(`${ccy} @ fx=${fx} produces consistent net/receive`, () => {
      const priceFiat = usdBtc * fx;
      const spend = 500 * fx;
      const netFee = 1.99 * fx;
      const q = computeFees(spend, BTC, true, priceFiat, netFee);
      // Receive must equal in-USD equivalent (fx cancels out).
      expect(q.receive).toBeCloseTo((500 - 1.99) / usdBtc, 10);
    });
  }
});