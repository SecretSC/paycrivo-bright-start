import { cn } from "@/lib/utils";

// Real SVG flags from the flag-icons package (instant, no broken remote images).
// `code` is an ISO 3166-1 alpha-2 country code, or "eu" for the European Union.
export function FlagIcon({
  code,
  size = 26,
  className,
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const c = (code || "").toLowerCase();
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-secondary",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className={`fi fi-${c} fis`}
        style={{ width: size, height: size, fontSize: size, lineHeight: `${size}px` }}
      />
    </span>
  );
}
