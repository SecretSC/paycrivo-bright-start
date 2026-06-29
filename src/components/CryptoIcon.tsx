import { useState } from "react";

// Symbols with recognizable brand icons in the open-source spothq icon set.
const BRAND_ICONS = new Set([
  "BTC","ETH","SOL","XRP","USDT","USDC","BNB","DOGE","TRX","ADA","LTC","AVAX","LINK","DOT",
  "MATIC","BCH","XLM","SHIB","UNI","ETC","ATOM","NEAR","FIL","ICP","HBAR","VET","ALGO","AAVE",
  "MKR","CRV","COMP","SUSHI","SNX","GRT","SAND","MANA","AXS","ENJ","CHZ","BAT","ZIL","IOTA",
  "QNT","OKB","CRO","CAKE","1INCH","EOS","DASH","ZEC","XMR","WAVES","NEO","THETA","FLOW",
  "EGLD","KAVA","ROSE","CELO","LRC","ANKR","STORJ","REN","ZRX","BAL","YFI","RUNE","KSM",
  "FTM","APE","GALA","FET","RNDR","OCEAN","AGIX","STX","HNT","AR","DCR","RVN","DGB","SC","ONT",
  "ICX","LSK","NMR","BAND","UMA","KNC","BNT","REQ","OGN","CVC","ELF","HOT","DENT","BTT","JST",
]);

// Symbols whose live icon lives under a different/legacy ticker.
const ICON_ALIAS: Record<string, string> = { POL: "matic", RNDR: "rndr" };

function iconUrl(symbol: string) {
  const slug = (ICON_ALIAS[symbol] ?? symbol).toLowerCase();
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@1.0.0/svg/color/${slug}.svg`;
}

export function CryptoIcon({
  symbol,
  color,
  size = 28,
}: {
  symbol: string;
  color: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const hasBrand = (BRAND_ICONS.has(symbol) || symbol in ICON_ALIAS) && !failed;

  if (hasBrand) {
    return (
      <img
        src={iconUrl(symbol)}
        alt={`${symbol} icon`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }

  // Polished ticker badge fallback for less-known / mock assets.
  const ticker = symbol.replace(/[^A-Z0-9]/gi, "").slice(0, 4);
  const fontScale = ticker.length >= 4 ? 0.3 : ticker.length === 3 ? 0.34 : 0.42;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: size * fontScale,
        letterSpacing: "-0.02em",
        boxShadow: `0 4px 12px -4px ${color}80`,
      }}
      aria-hidden
    >
      {ticker}
    </span>
  );
}
