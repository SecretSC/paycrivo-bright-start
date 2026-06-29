export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <span className="bg-gradient-primary grid size-9 place-items-center rounded-xl text-primary-foreground shadow-glow">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M6 19V5h6a4.5 4.5 0 0 1 0 9H8"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
        Pay<span className="text-gradient">Crivo</span>
      </span>
    </a>
  );
}