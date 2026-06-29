import { getAsset } from "@/data/cryptoAssets";
import { networksForAsset } from "@/lib/checkout";

export { networksForAsset };

export const EXCHANGE_DRAFT_KEY = "paycrivo_exchange_draft";
const EXCHANGE_ORDERS_KEY = "paycrivo_exchange_orders";

// Estimated network fee for the receive asset, expressed in USD.
const NETWORK_FEE_USD = 1.5;
// PayCrivo exchange spread (fully discounted on first exchange).
const PAYCRIVO_RATE = 0.005;

export type ExchangeQuote = {
  rate: number;          // 1 send ≈ rate receive
  grossReceive: number;  // before fees
  paycrivoFee: number;   // in receive tokens
  networkFee: number;    // in receive tokens
  netReceive: number;    // final estimate
  sendUsd: number;
  receiveUsd: number;
  firstExchange: boolean;
};

export function computeExchange(
  sendAmount: number,
  sendCoin: string,
  receiveCoin: string,
  sendUsd: number,
  receiveUsd: number,
  firstExchange = true,
): ExchangeQuote {
  const safe = Number.isFinite(sendAmount) && sendAmount > 0 ? sendAmount : 0;
  const rate = receiveUsd > 0 ? sendUsd / receiveUsd : 0;
  const grossReceive = safe * rate;
  const paycrivoBase = grossReceive * PAYCRIVO_RATE;
  const paycrivoFee = firstExchange ? 0 : paycrivoBase;
  const networkFee = receiveUsd > 0 ? NETWORK_FEE_USD / receiveUsd : 0;
  const netReceive = Math.max(grossReceive - paycrivoFee - networkFee, 0);
  return { rate, grossReceive, paycrivoFee, networkFee, netReceive, sendUsd, receiveUsd, firstExchange };
}

// Simulated PayCrivo deposit address based on the send network (staging only).
export function depositAddress(coin: string, network: string): string {
  const n = (network || "").toLowerCase();
  if (n.includes("bitcoin cash")) return "qzpaycrivo7stagingexample9deposit4addr2vault";
  if (n.includes("bitcoin")) return "bc1qpaycrivo0staging7exchange3deposit9vault5x2q";
  if (n.includes("solana")) return "PCx7Staging9SoLDeposit4VaultPayCrivoExchg2Hk8";
  if (n.includes("xrp")) return "rPayCrivoStaging9XRPDepositVault3Exchg";
  if (n.includes("tron")) return "TPayCrivoStaging9TrxDepositVault3Exchange8x";
  if (n.includes("litecoin")) return "ltc1qpaycrivostaging7ltc3deposit9vault5exchg2";
  if (n.includes("cardano")) return "addr1qpaycrivostaging9ada3deposit9vaultexchange5x2";
  if (n.includes("dogecoin")) return "DPayCrivoStaging9DogeDepositVault3Exchange8";
  if (n.includes("stellar")) return "GPAYCRIVOSTAGING9XLMDEPOSITVAULT3EXCHANGE8X2QWERTY7ASDFGHJ";
  // EVM-style default (ERC20 / BEP20 / Polygon / Avalanche / etc.)
  return "0xPayCr1v0Stag1ng7Exchange3Depos1tVault9aBcDeF12";
}

export type ExchangeStatus =
  | "Awaiting deposit"
  | "Deposit detected"
  | "Processing exchange"
  | "Sending crypto"
  | "Completed"
  | "Manual review"
  | "Failed"
  | "Cancelled";

export type ExchangeState = {
  step: number;
  sendAmount: string;
  sendCoin: string;
  sendNetwork: string;
  receiveCoin: string;
  receiveNetwork: string;
  email: string;
  agreeTerms: boolean;
  wallet: string;
  destinationTag: string;
  networkRiskAck: boolean;
  walletOwnership: "none" | "confirmed" | "manual";
  depositConfirmed: boolean;
  riskAck: boolean;
  reservedUntil: number; // ms timestamp the rate is held until
};

export const defaultExchange: ExchangeState = {
  step: 0,
  sendAmount: "1",
  sendCoin: "SOL",
  sendNetwork: networksForAsset("SOL")[0],
  receiveCoin: "BTC",
  receiveNetwork: networksForAsset("BTC")[0],
  email: "",
  agreeTerms: false,
  wallet: "",
  destinationTag: "",
  networkRiskAck: false,
  walletOwnership: "none",
  depositConfirmed: false,
  riskAck: false,
  reservedUntil: 0,
};

export function loadExchangeDraft(): ExchangeState | null {
  try {
    const raw = localStorage.getItem(EXCHANGE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExchangeState>;
    // Migrate older drafts that predate the wallet-ownership step.
    const migrated = !("walletOwnership" in parsed);
    let step = parsed.step ?? 0;
    if (migrated && step >= 3) step += 1; // shift Send crypto/Review past inserted Ownership step
    return { ...defaultExchange, ...parsed, step, walletOwnership: parsed.walletOwnership ?? "none" };
  } catch {
    return null;
  }
}

export function saveExchangeDraft(state: ExchangeState) {
  try {
    localStorage.setItem(EXCHANGE_DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearExchangeDraft() {
  try {
    localStorage.removeItem(EXCHANGE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export type ExchangeOrder = {
  id: string;
  createdAt: string;
  status: ExchangeStatus;
  sendAmount: string;
  sendCoin: string;
  sendNetwork: string;
  receiveCoin: string;
  receiveNetwork: string;
  receiveEstimate: number;
  rate: number;
  wallet: string;
  destinationTag?: string;
  email: string;
  depositAddress: string;
  depositConfirmed: boolean;
  walletOwnership?: "none" | "confirmed" | "manual";
  reservedUntil: number;
};

export function generateExchangeOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `PCX-2026-${rand}`;
}

export function saveExchangeOrder(order: ExchangeOrder) {
  try {
    const raw = localStorage.getItem(EXCHANGE_ORDERS_KEY);
    const list: ExchangeOrder[] = raw ? JSON.parse(raw) : [];
    list.unshift(order);
    localStorage.setItem(EXCHANGE_ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function getExchangeOrder(id: string): ExchangeOrder | null {
  try {
    const raw = localStorage.getItem(EXCHANGE_ORDERS_KEY);
    if (!raw) return null;
    const list: ExchangeOrder[] = JSON.parse(raw);
    return list.find((o) => o.id === id) ?? null;
  } catch {
    return null;
  }
}

export { getAsset };
