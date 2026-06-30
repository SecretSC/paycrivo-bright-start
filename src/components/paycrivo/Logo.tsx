import { useEffect, useState } from "react";
import lightLogo from "@/assets/paycrivo-light.png.asset.json";
import darkLogo from "@/assets/paycrivo-dark.png.asset.json";

interface LogoProps {
  /** Render only the "P" mark icon instead of the full wordmark. */
  markOnly?: boolean;
  /** Render as a plain element (no link). */
  asLink?: boolean;
  /** Extra classes for the wrapper. */
  className?: string;
  /** Tailwind height classes for the image. */
  imgClassName?: string;
  /** Force a theme variant. Defaults to auto-detecting the active theme. */
  variant?: "auto" | "dark" | "light";
}

/** Reads the active theme from the <html> class set by the no-flash script. */
function useActiveTheme(): "dark" | "light" {
  // Initialise from the <html> class the no-flash script already applied so the
  // correct logo variant renders immediately (no invisible-logo flash).
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );
  useEffect(() => {
    const read = () =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/**
 * PayCrivo brand mark — a vector rounded-tile "P" on the brand gradient.
 * Fully crisp at any size and legible on light and dark backgrounds.
 */
export function PaycrivoMark({
  size = 36,
  className = "",
  theme = "dark",
}: {
  size?: number;
  className?: string;
  theme?: "dark" | "light";
}) {
  // Unique gradient id so multiple marks on one page don't collide.
  const id = `pc-grad-${theme}`;
  // Light theme uses a deeper purple range for stronger contrast on white;
  // dark theme keeps the brighter, glowing gradient.
  const stops =
    theme === "light"
      ? { from: "#6D34F2", to: "#9061F0" }
      : { from: "#7C4DFF", to: "#A47BF7" };
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
          <stop offset="0" stopColor={stops.from} />
          <stop offset="1" stopColor={stops.to} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      {theme === "light" && (
        <rect x="0.5" y="0.5" width="47" height="47" rx="12.5" fill="none" stroke="rgba(17,10,36,0.08)" />
      )}
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
  variant = "auto",
}: LogoProps = {}) {
  const activeTheme = useActiveTheme();
  const theme = variant === "auto" ? activeTheme : variant;
  // markOnly keeps the crisp vector tile (used in collapsed admin sidebar).
  if (markOnly) {
    const mark = <PaycrivoMark size={38} className={imgClassName} theme={theme} />;
    if (!asLink) return <span className={`inline-flex items-center ${className}`}>{mark}</span>;
    return (
      <a href="/" className={`inline-flex items-center ${className}`} aria-label="PayCrivo home">
        {mark}
      </a>
    );
  }

  // Full wordmark: theme-aware official PayCrivo logo image.
  // Light theme -> dark "Pay" version; dark theme -> white "Pay" version.
  const src = theme === "dark" ? darkLogo.url : lightLogo.url;
  const content = (
    <img
      src={src}
      alt="PayCrivo"
      className={imgClassName ?? "h-8 w-auto"}
      draggable={false}
    />
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