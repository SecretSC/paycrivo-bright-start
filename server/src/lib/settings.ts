// Default platform settings. SMTP password is never stored here.
export const DEFAULT_SETTINGS = {
  general: {
    platformName: "PayCrivo",
    maintenanceMode: false,
    announcementBanner: "",
    supportAvailabilityText: "Support available 9am–9pm UTC, Mon–Sat.",
  },
  fees: {
    buyServiceFeePct: 1.5,
    exchangeSpreadPct: 0.5,
    firstPurchaseDiscountPct: 0,
    firstExchangeDiscountPct: 0,
  },
  support: {
    chatEnabled: true,
    greeting: "Tell us what you need help with. Our team can assist with purchases, exchanges, wallet address checks, and account questions.",
    officeHours: "9am–9pm UTC, Mon–Sat",
    autoReply: "Thanks. A PayCrivo support agent will reply here.",
    cannedReplies: [
      "Please confirm the wallet network before continuing.",
      "Your order is currently pending.",
      "Please do not share private keys or seed phrases.",
      "We are checking this for you.",
      "Please try refreshing the checkout page.",
    ],
  },
  reward: {
    enabled: true,
    amountUsd: 20,
    allowedAssets: ["USDT", "USDC", "BTC", "ETH", "SOL"],
    onePerCustomer: true,
    termsNote: "One welcome reward per customer. Subject to review. No crypto is sent automatically.",
  },
};