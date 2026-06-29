import { getAsset, type CryptoAsset } from "@/data/cryptoAssets";
import { fiats } from "@/lib/paycrivo-data";
export {
  PAYMENT_METHODS, paymentMethodsForFiat, getPaymentMethod,
  type PaymentMethodDef, type PaymentMethodIcon,
} from "@/data/paymentMethods";

// Approx USD value per fiat unit, used only for min/max validation in staging.
const fiatToUsd: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, DKK: 0.145, NOK: 0.094, SEK: 0.095,
  PLN: 0.25, CAD: 0.73, AUD: 0.66, CHF: 1.11, AED: 0.27, TRY: 0.031,
  BRL: 0.2, MXN: 0.058, JPY: 0.0064, INR: 0.012,
};

export const MIN_USD = 30;
export const MAX_USD = 10000;

export const usdValueOf = (amount: number, fiatCode: string) =>
  amount * (fiatToUsd[fiatCode] ?? 1);

export type FeeBreakdown = {
  amount: number;
  serviceFee: number;
  networkFee: number;
  paycrivoFee: number;
  discount: number;
  totalFees: number;
  net: number;
  receive: number;
  total: number;
};

export function computeFees(
  amount: number,
  asset: CryptoAsset,
  firstPurchase = true,
  priceFiat?: number,
  networkFeeFiat = 1.99,
): FeeBreakdown {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const serviceFee = safe * 0.01;
  const networkFee = networkFeeFiat;
  const basePaycrivo = safe * 0.005;
  const discount = firstPurchase ? basePaycrivo : 0;
  const paycrivoFee = basePaycrivo - discount;
  const totalFees = serviceFee + networkFee + paycrivoFee;
  const net = Math.max(safe - totalFees, 0);
  const unitPrice = priceFiat && priceFiat > 0 ? priceFiat : asset.mockPriceUsd;
  const receive = unitPrice > 0 ? net / unitPrice : 0;
  return {
    amount: safe,
    serviceFee,
    networkFee,
    paycrivoFee,
    discount,
    totalFees,
    net,
    receive,
    total: safe,
  };
}

// Networks selectable per asset on the wallet step.
export function networksForAsset(symbol: string): string[] {
  const asset = getAsset(symbol);
  if (asset && asset.supportedNetworks.length) return asset.supportedNetworks;
  return ["Ethereum/ERC20"];
}

// Loose, prototype-only wallet validation by network.
export function validateWalletAddress(address: string, network: string): string | null {
  const a = address.trim();
  if (!a) return "Wallet address is required.";
  const n = network.toLowerCase();
  if (n.includes("bitcoin cash")) {
    if (a.length < 20) return "This doesn't look like a valid address.";
    return null;
  }
  if (n.includes("bitcoin")) {
    if (!/^(bc1|1|3)/.test(a) || a.length < 14) return "Bitcoin addresses start with bc1, 1, or 3.";
    return null;
  }
  if (n.includes("erc20") || n.includes("bep20") || n.includes("polygon") || n.includes("avalanche") || n.includes("ethereum")) {
    if (!/^0x[a-fA-F0-9]{6,}$/.test(a)) return "EVM addresses start with 0x.";
    return null;
  }
  if (n.includes("solana")) {
    if (a.length < 30) return "This doesn't look like a valid Solana address.";
    return null;
  }
  if (n.includes("xrp")) {
    if (!/^r/.test(a) || a.length < 20) return "XRP addresses start with r.";
    return null;
  }
  if (n.includes("tron")) {
    if (!/^T/.test(a) || a.length < 20) return "Tron addresses start with T.";
    return null;
  }
  if (a.length < 12) return "This doesn't look like a valid address.";
  return null;
}

export type CheckoutState = {
  step: number;
  spend: string;
  fiat: string;
  coin: string;
  method: string;
  email: string;
  agreeTerms: boolean;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postal: string;
  detailsConfirmed: boolean;
  wallet: string;
  network: string;
  saveWallet: boolean;
  riskAck: boolean;
  walletOwnership: "none" | "confirmed" | "manual";
  destinationTag: string;
  networkRiskAck: boolean;
  flowV?: number;
};

export const defaultCheckout: CheckoutState = {
  step: 0,
  spend: "500",
  fiat: "USD",
  coin: "BTC",
  method: "card",
  email: "",
  agreeTerms: false,
  firstName: "",
  lastName: "",
  dob: "",
  phone: "",
  country: "",
  address: "",
  city: "",
  postal: "",
  detailsConfirmed: false,
  wallet: "",
  network: "",
  saveWallet: false,
  riskAck: false,
  walletOwnership: "none",
  destinationTag: "",
  networkRiskAck: false,
  flowV: 2,
};

export const DRAFT_KEY = "paycrivo-checkout-draft";
export const ORDERS_KEY = "paycrivo-orders";

export function loadDraft(): CheckoutState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutState>;
    // Migrate pre-v2 drafts that included a KYC/verification step.
    let step = parsed.step ?? 0;
    if (parsed.flowV !== 2) step = step >= 4 ? step - 1 : Math.min(step, 3);
    return { ...defaultCheckout, ...parsed, step, flowV: 2 };
  } catch {
    return null;
  }
}

export function saveDraft(state: CheckoutState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export type Order = {
  id: string;
  createdAt: string;
  status: string;
  spend: string;
  fiat: string;
  coin: string;
  method: string;
  wallet: string;
  network: string;
  receive: number;
  fees: FeeBreakdown;
  email: string;
  walletOwnership?: "none" | "confirmed" | "manual";
  destinationTag?: string;
};

export function generateOrderId(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `PCV-2026-${rand}`;
}

export function saveOrder(order: Order) {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    const list: Order[] = raw ? JSON.parse(raw) : [];
    list.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function getOrder(id: string): Order | null {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return null;
    const list: Order[] = JSON.parse(raw);
    return list.find((o) => o.id === id) ?? null;
  } catch {
    return null;
  }
}

export const COUNTRIES = [
  "United States", "United Kingdom", "Denmark", "Norway", "Sweden", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Poland", "Ireland", "Portugal",
  "Belgium", "Austria", "Switzerland", "Finland", "Canada", "Australia",
  "United Arab Emirates", "Turkey", "Brazil", "Mexico", "Japan", "India",
  "Singapore", "South Africa", "New Zealand",
];

export const fiatByCode = (code: string) => fiats.find((f) => f.code === code) ?? fiats[0];
export { getAsset };
