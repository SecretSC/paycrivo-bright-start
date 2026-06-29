// Privacy helpers — never leak full secrets / wallets to live feed.
export function shortenAddress(addr?: string | null): string {
  if (!addr) return "";
  return addr.length > 14 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

const SECRET_HINTS = [
  /\b([a-z]+\s+){11,}[a-z]+\b/i, // 12+ space-separated words (seed phrase)
  /\b(private\s*key|seed\s*phrase|mnemonic|recovery\s*phrase)\b/i,
  /\b[0-9]{13,19}\b/, // long card-like number runs
];

// Returns true when a customer message looks like it contains a wallet secret.
export function looksLikeSecret(text: string): boolean {
  return SECRET_HINTS.some((re) => re.test(text));
}

// Strip anything that resembles a secret before persisting/echoing.
export function redactSecrets(text: string): string {
  return looksLikeSecret(text)
    ? "[redacted — message appeared to contain a wallet secret]"
    : text;
}