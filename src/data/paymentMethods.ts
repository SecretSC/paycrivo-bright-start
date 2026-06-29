export type PaymentMethodIcon =
  | "card" | "apple" | "google" | "bank" | "sepa"
  | "mobilepay" | "pix" | "trustly" | "ach" | "wire" | "faster";

export type PaymentMethodDef = {
  id: string;
  name: string;
  desc: string;
  speed: string;
  icon: PaymentMethodIcon;
};

export const PAYMENT_METHODS: Record<string, PaymentMethodDef> = {
  card: { id: "card", name: "Credit / Debit Card", desc: "Visa, Mastercard", speed: "Instant", icon: "card" },
  apple: { id: "apple", name: "Apple Pay", desc: "Pay with Touch / Face ID", speed: "Instant", icon: "apple" },
  google: { id: "google", name: "Google Pay", desc: "Fast checkout", speed: "Instant", icon: "google" },
  bank: { id: "bank", name: "Bank Transfer", desc: "Standard transfer", speed: "1–2 business days", icon: "bank" },
  sepa: { id: "sepa", name: "SEPA Transfer", desc: "Euro area · low fee", speed: "Same day", icon: "sepa" },
  trustly: { id: "trustly", name: "Trustly", desc: "Instant bank payment", speed: "Instant", icon: "trustly" },
  mobilepay: { id: "mobilepay", name: "MobilePay", desc: "Denmark", speed: "Instant", icon: "mobilepay" },
  pix: { id: "pix", name: "PIX", desc: "Brazil instant payment", speed: "Instant", icon: "pix" },
  ach: { id: "ach", name: "ACH Transfer", desc: "US bank account", speed: "1–3 business days", icon: "ach" },
  wire: { id: "wire", name: "Wire Transfer", desc: "Best for large amounts", speed: "Same day", icon: "wire" },
  faster: { id: "faster", name: "Faster Payments", desc: "UK instant bank", speed: "Instant", icon: "faster" },
};

// Ordered availability per fiat currency.
const AVAILABILITY: Record<string, string[]> = {
  DKK: ["card", "apple", "google", "bank", "trustly", "mobilepay"],
  EUR: ["card", "apple", "google", "sepa", "bank", "trustly"],
  USD: ["card", "apple", "google", "bank", "ach", "wire"],
  GBP: ["card", "apple", "google", "bank", "faster", "trustly"],
  BRL: ["card", "apple", "google", "pix", "bank"],
  SEK: ["card", "apple", "google", "bank", "trustly"],
  NOK: ["card", "apple", "google", "bank", "trustly"],
};

const FALLBACK = ["card", "apple", "google", "bank"];

export function paymentMethodsForFiat(fiat: string): PaymentMethodDef[] {
  const ids = AVAILABILITY[fiat] ?? FALLBACK;
  return ids.map((id) => PAYMENT_METHODS[id]).filter(Boolean);
}

export function getPaymentMethod(id: string): PaymentMethodDef {
  return PAYMENT_METHODS[id] ?? PAYMENT_METHODS.card;
}
