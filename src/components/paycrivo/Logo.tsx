interface LogoProps {
  /** Render only the "P" mark icon instead of the full wordmark. */
  markOnly?: boolean;
  /** Render as a plain element (no link). */
  asLink?: boolean;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Tailwind height classes for the image. */
  imgClassName?: string;
}

/**
 * PayCrivo brand mark — a vector rounded-tile "P" on the brand gradient.
 * Fully crisp at any size and legible on light and dark backgrounds.
 */
export function PaycrivoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const id = "pc-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="PayCrivo"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C4DFF" />
          <stop offset="1" stopColor="#A47BF7" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      <path
        d="M14 12 H27 A7 7 0 0 1 27 26 H20 V36 H14 Z M20 17 H25 A2 2 0 0 1 25 21 H20 Z"
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Logo({
  markOnly = false,
  asLink = true,
  className = "",
  imgClassName,
}: LogoProps = {}) {
  const markSize = markOnly ? 38 : 34;
  const content = (
    <span className="inline-flex items-center gap-2.5 select-none">
      <PaycrivoMark size={markSize} className={imgClassName} />
      {!markOnly && (
        <span className="font-display text-[1.35rem] font-extrabold leading-none tracking-tight text-foreground">
          PayCrivo
        </span>
      )}
    </span>
  );

  if (!asLink) {
    return <span className={`inline-flex items-center ${className}`}>{content}</span>;
  }

  return (
    <a href="/" className={`inline-flex items-center ${className}`} aria-label="PayCrivo home">
      {content}
    </a>
  );
}