import { useEffect, useMemo, useRef, useState } from "react";

// Locally bundled SVG logos (instant, same-origin, never a broken remote image).
const localIcons = import.meta.glob(
  "/node_modules/cryptocurrency-icons/svg/color/*.svg",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

function localUrl(slug: string): string | undefined {
  return localIcons[`/node_modules/cryptocurrency-icons/svg/color/${slug}.svg`];
}

// Some assets share a logo with a legacy/related ticker in the bundled set.
const SLUG_ALIAS: Record<string, string> = {
  POL: "matic",
  RNDR: "rndr",
  WETH: "eth",
};

// Newer assets missing from the bundled set — served from a reliable CDN.
const remoteUrl = (slug: string) =>
  `https://assets.coincap.io/assets/icons/${slug}@2x.png`;

export function CryptoIcon({
  symbol,
  color,
  size = 32,
}: {
  symbol: string;
  color: string;
  size?: number;
}) {
  const sym = (symbol || "").toUpperCase();
  const slug = (SLUG_ALIAS[sym] ?? sym).toLowerCase();

  // Ordered candidate sources: bundled SVG first, then CDN.
  const sources = useMemo(() => {
    const out: string[] = [];
    const l = localUrl(slug);
    if (l) out.push(l);
    if (slug) out.push(remoteUrl(slug));
    return out;
  }, [slug]);

  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = sources[idx];
  const exhausted = idx >= sources.length;
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset load state when the source changes, and immediately mark loaded for
  // images that are already complete (data URIs / cached) where onLoad won't fire.
  useEffect(() => {
    setLoaded(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  const ticker = sym.replace(/[^A-Z0-9]/gi, "").slice(0, 4);
  const fontScale = ticker.length >= 4 ? 0.3 : ticker.length === 3 ? 0.34 : 0.42;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Always-present polished badge base: shows while loading or if all sources fail. */}
      {(!loaded || exhausted) && (
        <span
          className="absolute inset-0 inline-flex items-center justify-center font-bold uppercase text-white"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            fontSize: size * fontScale,
            letterSpacing: "-0.02em",
          }}
        >
          {ticker}
        </span>
      )}
      {src && !exhausted && (
        <img
          ref={imgRef}
          src={src}
          alt={`${sym} logo`}
          width={size}
          height={size}
          loading="eager"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setIdx((i) => i + 1);
          }}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </span>
  );
}
