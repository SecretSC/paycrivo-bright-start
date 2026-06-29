export function FiatBadge({ symbol, size = 26 }: { symbol: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-bold text-secondary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {symbol}
    </span>
  );
}