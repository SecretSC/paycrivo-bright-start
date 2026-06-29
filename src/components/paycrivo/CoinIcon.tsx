export function CoinIcon({
  symbol,
  color,
  size = 28,
}: {
  symbol: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
        boxShadow: `0 4px 12px -4px ${color}80`,
      }}
      aria-hidden
    >
      {symbol.slice(0, 1)}
    </span>
  );
}