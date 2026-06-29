import { usePrices } from "@/services/priceService";
import { getAsset } from "@/data/cryptoAssets";
import { computeExchange, type ExchangeQuote } from "@/lib/exchange";

// Live exchange quote: send/receive USD prices -> rate + net receive estimate.
export function useExchangeQuote(
  sendAmount: string | number,
  sendCoin: string,
  receiveCoin: string,
  firstExchange = true,
): ExchangeQuote & { status: "live" | "estimate"; lastUpdated: number } {
  const snap = usePrices();
  const sendAsset = getAsset(sendCoin);
  const receiveAsset = getAsset(receiveCoin);
  const sendUsd = snap.prices[sendCoin]?.price ?? sendAsset?.mockPriceUsd ?? 0;
  const receiveUsd = snap.prices[receiveCoin]?.price ?? receiveAsset?.mockPriceUsd ?? 0;
  const amount = typeof sendAmount === "number" ? sendAmount : parseFloat(sendAmount) || 0;
  const quote = computeExchange(amount, sendCoin, receiveCoin, sendUsd, receiveUsd, firstExchange);
  return { ...quote, status: snap.status, lastUpdated: snap.lastUpdated };
}

// Destination tag / memo requirement by receive asset or network.
export function needsDestinationTag(coin: string, network: string): { needs: boolean; label: string } {
  const c = coin.toUpperCase();
  const n = (network || "").toLowerCase();
  if (c === "XRP" || n.includes("xrp")) return { needs: true, label: "Destination tag (optional)" };
  if (c === "XLM" || n.includes("stellar")) return { needs: true, label: "Memo (optional)" };
  if (c === "TON" || n.includes("ton")) return { needs: true, label: "Memo/comment (optional)" };
  return { needs: false, label: "" };
}
