export type Coin = {
  symbol: string;
  name: string;
  color: string;
  price: number;
  change24h: number;
};

export const cryptos: Coin[] = [
  { symbol: "BTC", name: "Bitcoin", color: "#f7931a", price: 67432.18, change24h: 2.41 },
  { symbol: "ETH", name: "Ethereum", color: "#627eea", price: 3521.74, change24h: 1.18 },
  { symbol: "USDT", name: "Tether", color: "#26a17b", price: 1.0, change24h: 0.01 },
  { symbol: "USDC", name: "USD Coin", color: "#2775ca", price: 1.0, change24h: -0.02 },
  { symbol: "SOL", name: "Solana", color: "#14f195", price: 172.36, change24h: 5.62 },
  { symbol: "LTC", name: "Litecoin", color: "#345d9d", price: 84.21, change24h: -1.04 },
  { symbol: "BNB", name: "BNB", color: "#f3ba2f", price: 598.45, change24h: 0.92 },
  { symbol: "XRP", name: "XRP", color: "#23292f", price: 0.5273, change24h: -2.31 },
  { symbol: "DOGE", name: "Dogecoin", color: "#c2a633", price: 0.1612, change24h: 4.18 },
  { symbol: "ADA", name: "Cardano", color: "#0033ad", price: 0.4521, change24h: -0.74 },
  { symbol: "TRX", name: "TRON", color: "#eb0029", price: 0.1182, change24h: 1.05 },
  { symbol: "DOT", name: "Polkadot", color: "#e6007a", price: 6.84, change24h: 3.27 },
  { symbol: "MATIC", name: "Polygon", color: "#8247e5", price: 0.7213, change24h: -1.92 },
  { symbol: "AVAX", name: "Avalanche", color: "#e84142", price: 36.18, change24h: 6.41 },
  { symbol: "BCH", name: "Bitcoin Cash", color: "#0ac18e", price: 472.9, change24h: 0.58 },
  { symbol: "XLM", name: "Stellar", color: "#14b6e7", price: 0.1093, change24h: -0.41 },
  { symbol: "LINK", name: "Chainlink", color: "#2a5ada", price: 14.72, change24h: 2.88 },
  { symbol: "UNI", name: "Uniswap", color: "#ff007a", price: 7.91, change24h: -3.12 },
];

export type Fiat = { code: string; name: string; symbol: string; flag: string; country: string; popular?: boolean };

export const fiats: Fiat[] = [
  { code: "USD", name: "United States Dollar", symbol: "$", flag: "🇺🇸", country: "us", popular: true },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", country: "eu", popular: true },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", country: "gb", popular: true },
  { code: "DKK", name: "Danish Krone", symbol: "kr", flag: "🇩🇰", country: "dk", popular: true },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", flag: "🇳🇴", country: "no", popular: true },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", flag: "🇸🇪", country: "se", popular: true },
  { code: "CAD", name: "Canadian Dollar", symbol: "$", flag: "🇨🇦", country: "ca", popular: true },
  { code: "AUD", name: "Australian Dollar", symbol: "$", flag: "🇦🇺", country: "au", popular: true },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", flag: "🇨🇭", country: "ch", popular: true },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", flag: "🇵🇱", country: "pl", popular: true },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", country: "ae" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", country: "tr" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", country: "br" },
  { code: "MXN", name: "Mexican Peso", symbol: "$", flag: "🇲🇽", country: "mx" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", country: "jp" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", country: "in" },
];

export type PaymentMethod = { id: string; name: string; desc: string };

export const paymentMethods: PaymentMethod[] = [
  { id: "card", name: "Credit / Debit Card", desc: "Visa, Mastercard · Instant" },
  { id: "apple", name: "Apple Pay", desc: "Instant checkout" },
  { id: "google", name: "Google Pay", desc: "Instant checkout" },
  { id: "sepa", name: "SEPA Transfer", desc: "1–2 business days · low fee" },
  { id: "wire", name: "Bank Wire", desc: "Best for large amounts" },
];

export const faqs = [
  {
    q: "Is PayCrivo safe to use?",
    a: "PayCrivo uses strong encryption, continuous fraud monitoring, and secure infrastructure. Your crypto is delivered straight to your own wallet — we never hold it longer than the transaction requires.",
  },
  {
    q: "How fast will I receive my crypto?",
    a: "Card and wallet payments are processed instantly. Once your order is approved, your crypto is sent to your wallet within minutes.",
  },
  {
    q: "What fees does PayCrivo charge?",
    a: "Every fee — exchange rate, service fee, network fee and PayCrivo fee — is shown before you confirm. Your first purchase comes with a 0% PayCrivo fee.",
  },
  {
    q: "Do I need to verify my identity?",
    a: "Verification is quick and only required once. Most users are approved in under two minutes with a photo ID and a selfie.",
  },
  {
    q: "Which countries does PayCrivo support?",
    a: "PayCrivo supports customers across Europe, the UK, North America, and a growing list of regions worldwide with 16 fiat currencies.",
  },
  {
    q: "Can I buy crypto to my own wallet?",
    a: "Yes. PayCrivo is non-custodial at delivery — you choose the destination wallet and your assets are sent directly to you.",
  },
];

export const formatPrice = (n: number) =>
  n >= 1
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });