// Frontend-only, network-aware wallet address validation for PayCrivo (staging).
// NOTE: This validates format only. It does NOT prove on-chain ownership and
// makes no blockchain calls.

export type WalletCheck = { valid: boolean; error?: string; warning?: string };

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isEvm(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// Detect what an address "looks like" so we can warn on network mismatch.
export function detectAddressKind(addr: string): string | null {
  const a = addr.trim();
  if (!a) return null;
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "EVM (0x)";
  if (/^(bc1|[13])/.test(a) && a.length >= 26 && a.length <= 62 && !a.startsWith("0x")) return "Bitcoin";
  if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a)) return "XRP";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return "Tron";
  return null;
}

export function validateWallet(address: string, network: string): WalletCheck {
  const a = address.trim();
  if (!a) return { valid: false, error: "Wallet address is required." };
  const n = network.toLowerCase();

  const evmNetwork =
    n.includes("erc20") || n.includes("bep20") || n.includes("ethereum") ||
    n.includes("polygon") || n.includes("avalanche") || n.includes("arbitrum") ||
    n.includes("optimism") || n.includes("base") || n.includes("bnb smart");

  if (evmNetwork) {
    if (!isEvm(a)) return { valid: false, error: "This address does not match the selected network. EVM addresses are 0x followed by 40 hex characters." };
    return { valid: true };
  }

  if (n.includes("bitcoin cash")) {
    const ok = /^(bitcoincash:)?[qp][a-z0-9]{38,}$/.test(a) || /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "This does not look like a Bitcoin Cash address." };
  }
  if (n.includes("bitcoin")) {
    if (isEvm(a)) return { valid: false, error: "You pasted an Ethereum-style address, but Bitcoin is selected." };
    const ok = /^(bc1[a-z0-9]{20,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,40})$/.test(a) && a.length >= 26 && a.length <= 62;
    return ok ? { valid: true } : { valid: false, error: "Bitcoin addresses start with bc1, 1, or 3." };
  }
  if (n.includes("solana")) {
    if (isEvm(a)) return { valid: false, error: "You pasted an Ethereum-style address, but Solana is selected." };
    const ok = BASE58.test(a) && a.length >= 32 && a.length <= 44;
    return ok ? { valid: true } : { valid: false, error: "This does not look like a Solana address." };
  }
  if (n.includes("xrp")) {
    if (isEvm(a)) return { valid: false, error: "You pasted an Ethereum-style address, but XRP Ledger is selected." };
    const ok = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a);
    return ok
      ? { valid: true, warning: "Some XRP wallets require a destination tag. If your wallet requires one, add it before continuing." }
      : { valid: false, error: "XRP addresses start with r and are 25–35 characters." };
  }
  if (n.includes("tron")) {
    if (isEvm(a)) return { valid: false, error: "You pasted an Ethereum-style address, but Tron is selected." };
    const ok = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "Tron addresses start with T and are 34 characters." };
  }
  if (n.includes("litecoin")) {
    if (isEvm(a)) return { valid: false, error: "You pasted an Ethereum-style address, but Litecoin is selected." };
    const ok = /^(ltc1[a-z0-9]{20,60}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,40})$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "Litecoin addresses start with ltc1, L, M, or 3." };
  }
  if (n.includes("cardano")) {
    const ok = /^addr1[a-z0-9]{20,}$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "Cardano addresses start with addr1." };
  }
  if (n.includes("dogecoin")) {
    const ok = /^D[1-9A-HJ-NP-Za-km-z]{25,40}$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "Dogecoin addresses start with D." };
  }
  if (n.includes("stellar")) {
    const ok = /^G[A-Z2-7]{55}$/.test(a);
    return ok ? { valid: true } : { valid: false, error: "Stellar addresses start with G and are 56 characters." };
  }
  // Generic fallback: reasonable base58/alphanumeric length.
  const ok = /^[a-zA-Z0-9:_-]{12,80}$/.test(a);
  return ok ? { valid: true } : { valid: false, error: "This does not look like a valid address." };
}

export function networkNeedsDestinationTag(network: string) {
  return network.toLowerCase().includes("xrp");
}
