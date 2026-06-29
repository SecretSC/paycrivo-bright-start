// Shared presentation helpers + constants for the Admin Support Center.
export const STATUS_LABELS: Record<string, string> = {
  open: "New",
  pending: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

export const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  high: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export const TOPIC_LABELS: Record<string, string> = {
  purchase: "Purchase help",
  exchange: "Exchange help",
  wallet: "Wallet address help",
  account: "Account help",
  reward: "Reward claim",
  other: "Other",
};

export const CANNED_RESPONSES: { label: string; text: string }[] = [
  {
    label: "Greeting",
    text: "Hi, thanks for reaching out to PayCrivo Support. I'd be happy to help — could you share a little more detail so I can look into this for you?",
  },
  {
    label: "Order status",
    text: "I've checked your order and it's currently being processed. You'll receive a confirmation as soon as it completes. Is there anything else I can help with?",
  },
  {
    label: "Verification time",
    text: "Verification usually completes within a few minutes. If it takes longer, please don't worry — I'll keep an eye on it from our side.",
  },
  {
    label: "Wallet reminder",
    text: "Please double-check the wallet address and network before confirming. Crypto transfers can't be reversed once sent.",
  },
  {
    label: "Security reminder",
    text: "For your safety, PayCrivo will never ask for your seed phrase, private keys, passwords, or full card details. Please never share these with anyone.",
  },
  {
    label: "Closing",
    text: "Glad I could help! I'll go ahead and resolve this ticket, but feel free to reply any time if you need anything else. Have a great day!",
  },
];

// Redact anything that looks like a wallet secret / OTP / card before display.
const SECRET_RE =
  /\b(seed\s?phrase|recovery\s?phrase|mnemonic|private\s?key|secret\s?key|pass\s?word|passphrase)\b/i;
const LONG_WORDS_RE = /\b([a-z]+\s+){11,}[a-z]+\b/i;
const CARD_RE = /\b\d{13,19}\b/g;
const OTP_RE = /\b(otp|code)[:\s]+\d{4,8}\b/gi;

export function redactForDisplay(text: string): string {
  if (SECRET_RE.test(text) || LONG_WORDS_RE.test(text)) {
    return "[redacted — message appeared to contain a wallet secret]";
  }
  return text.replace(CARD_RE, "•••• •••• •••• ••••").replace(OTP_RE, "[redacted code]");
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function initials(name?: string | null, email?: string | null): string {
  const src = (name && name.trim()) || email || "?";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || src[0].toUpperCase();
}
