// Mocked tests for the server-side price/FX oracle. Verifies caching,
// timeouts, HTTP errors, fallbacks and price-status labelling.
//
// We deliberately test the oracle used by the *server* quote engine
// (not the frontend hook) because the browser's numbers are not
// authoritative. Race-condition/stale-response protection for the
// frontend price hook is documented in src/services/priceService.ts
// and enforced by the request-cancellation code there.

import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetOracle,
  __setPriceFetch,
  __setFxFetch,
  getPriceUsd,
  getFxRate,
} from "../server/src/lib/priceOracle";

function okJson(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => body });
}
function httpErr(status: number) {
  return Promise.resolve({ ok: false, status, json: async () => ({}) });
}
function netErr() {
  return Promise.reject(new Error("network"));
}

beforeEach(() => __resetOracle());

describe("getPriceUsd (CoinGecko-shaped)", () => {
  it("returns live price on success and marks status=live", async () => {
    __setPriceFetch(() => okJson({
      bitcoin: { usd: 60000 }, ethereum: { usd: 3000 },
    }));
    const btc = await getPriceUsd("BTC");
    expect(btc.price).toBe(60000);
    expect(btc.status).toBe("live");
  });
  it("returns multiple assets from one cached fetch", async () => {
    let calls = 0;
    __setPriceFetch(() => { calls++; return okJson({ bitcoin: { usd: 60000 }, ethereum: { usd: 3000 } }); });
    await getPriceUsd("BTC");
    const eth = await getPriceUsd("ETH");
    expect(eth.price).toBe(3000);
    expect(calls).toBe(1); // second call hits cache
  });
  it("missing asset in provider payload falls back to estimate", async () => {
    __setPriceFetch(() => okJson({ bitcoin: { usd: 60000 } })); // no eth
    const eth = await getPriceUsd("ETH");
    expect(eth.status).toBe("estimate");
    expect(eth.price).toBeGreaterThan(0); // FALLBACK_PRICE_USD
  });
  it("zero price is rejected as no live price → estimate fallback", async () => {
    __setPriceFetch(() => okJson({ bitcoin: { usd: 0 } }));
    const btc = await getPriceUsd("BTC");
    expect(btc.status).toBe("estimate");
    expect(btc.price).toBeGreaterThan(0);
  });
  it("HTTP 429 falls back to estimate", async () => {
    __setPriceFetch(() => httpErr(429));
    const btc = await getPriceUsd("BTC");
    expect(btc.status).toBe("estimate");
  });
  it("HTTP 500 falls back to estimate", async () => {
    __setPriceFetch(() => httpErr(500));
    const btc = await getPriceUsd("BTC");
    expect(btc.status).toBe("estimate");
  });
  it("network error falls back to estimate", async () => {
    __setPriceFetch(() => netErr());
    const btc = await getPriceUsd("BTC");
    expect(btc.status).toBe("estimate");
  });
  it("invalid JSON (throws in json()) falls back to estimate", async () => {
    __setPriceFetch(() => Promise.resolve({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } }));
    const btc = await getPriceUsd("BTC");
    expect(btc.status).toBe("estimate");
  });
  it("unsupported symbol returns 0", async () => {
    __setPriceFetch(() => okJson({}));
    const r = await getPriceUsd("SCAMCOIN");
    expect(r.price).toBe(0);
  });
  it("fallback is NEVER labelled 'live'", async () => {
    __setPriceFetch(() => httpErr(503));
    const r = await getPriceUsd("BTC");
    expect(r.status).not.toBe("live");
  });
});

describe("getFxRate (Frankfurter-shaped)", () => {
  it("USD is always live 1", async () => {
    __setFxFetch(() => okJson({ rates: {} }));
    const r = await getFxRate("USD");
    expect(r.rate).toBe(1);
    expect(r.status).toBe("live");
  });
  it("returns live rate for EUR/GBP/DKK/NOK/SEK", async () => {
    __setFxFetch(() => okJson({ rates: { EUR: 0.9, GBP: 0.78, DKK: 6.9, NOK: 10.7, SEK: 10.4 } }));
    for (const [c, v] of Object.entries({ EUR: 0.9, GBP: 0.78, DKK: 6.9, NOK: 10.7, SEK: 10.4 })) {
      const r = await getFxRate(c);
      expect(r.status).toBe("live");
      expect(r.rate).toBe(v);
    }
  });
  it("unsupported base currency returns 0", async () => {
    __setFxFetch(() => okJson({ rates: {} }));
    const r = await getFxRate("XYZ");
    expect(r.rate).toBe(0);
  });
  it("HTTP error falls back to estimate", async () => {
    __setFxFetch(() => httpErr(500));
    const r = await getFxRate("EUR");
    expect(r.status).toBe("estimate");
    expect(r.rate).toBeGreaterThan(0);
  });
  it("timeout / abort falls back to estimate", async () => {
    __setFxFetch(() => Promise.reject(new DOMException("aborted", "AbortError")));
    const r = await getFxRate("EUR");
    expect(r.status).toBe("estimate");
  });
  it("invalid rate values (zero, negative, non-number) are ignored", async () => {
    __setFxFetch(() => okJson({ rates: { EUR: 0, GBP: -1, DKK: "x" } }));
    const r = await getFxRate("EUR");
    expect(r.status).toBe("estimate");
  });
  it("cached rate returned on second call without new fetch", async () => {
    let calls = 0;
    __setFxFetch(() => { calls++; return okJson({ rates: { EUR: 0.92 } }); });
    await getFxRate("EUR");
    await getFxRate("EUR");
    expect(calls).toBe(1);
  });
});