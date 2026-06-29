import logoWordmark from "@/assets/paycrivo-logo.png";
import logoMark from "@/assets/paycrivo-mark.png";

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

export function Logo({
  markOnly = false,
  asLink = true,
  className = "",
  imgClassName,
}: LogoProps = {}) {
  const src = markOnly ? logoMark : logoWordmark;
  const sizing =
    imgClassName ??
    (markOnly
      ? "h-9 w-auto"
      : "h-8 w-auto sm:h-9 max-w-[150px] sm:max-w-[180px]");

  const img = (
    <img
      src={src}
      alt="PayCrivo"
      className={`${sizing} select-none object-contain`}
      draggable={false}
      width={markOnly ? 36 : 180}
      height={36}
    />
  );

  if (!asLink) {
    return <span className={`inline-flex items-center ${className}`}>{img}</span>;
  }

  return (
    <a href="/" className={`inline-flex items-center ${className}`} aria-label="PayCrivo home">
      {img}
    </a>
  );
}