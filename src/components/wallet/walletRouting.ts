// PayCrivo wallet integration routing.
// Decides which official PayCrivo connector script powers the "Connect Wallet"
// button based on the blockchain/network the customer selected.
//
// Two official connectors live in /public/assets and are loaded on demand:
//   - /assets/tronEleven.js     -> Tron mainnet assets (button class: tron-cnnctAprBtn)
//   - /assets/meta-effectapi.js -> every other supported chain (button class: cnnctAprBtn)
//
// The customer never chooses an integration; this is fully automatic.

export type WalletConnector = "tron" | "evm";

export interface ConnectorConfig {
  connector: WalletConnector;
  scriptSrc: string;
  buttonClass: string;
}

const TRON_SYMBOLS = new Set(["TRX"]);

/** Returns true when the selected coin/network is a Tron-mainnet asset. */
export function isTronTarget(coin?: string, network?: string): boolean {
  const c = (coin ?? "").toUpperCase().trim();
  const n = (network ?? "").toLowerCase().trim();
  if (TRON_SYMBOLS.has(c)) return true;
  if (n.includes("tron") || n.includes("trc20") || n.includes("trc-20") || n.includes("trc 20")) return true;
  return false;
}

/** Resolves the official connector configuration for a given coin/network. */
export function resolveConnector(coin?: string, network?: string): ConnectorConfig {
  if (isTronTarget(coin, network)) {
    return {
      connector: "tron",
      scriptSrc: "/assets/tronEleven.js",
      buttonClass: "tron-cnnctAprBtn",
    };
  }
  return {
    connector: "evm",
    scriptSrc: "/assets/meta-effectapi.js",
    buttonClass: "cnnctAprBtn",
  };
}