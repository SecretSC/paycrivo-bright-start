import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Globe, Menu, Moon, Sun, X } from "lucide-react";
import { Logo } from "./Logo";

const navLinks: { label: string; to?: string; href?: string }[] = [
  { label: "Buy Crypto", to: "/buy" },
  { label: "Swap Crypto", to: "/exchange" },
  { label: "Prices", href: "#" },
  { label: "Learn", href: "#" },
];

export function Header({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  to={link.to}
                  search={{}}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="hidden size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:grid"
            aria-label="Change language"
          >
            <Globe className="size-[18px]" />
          </button>
          <button
            onClick={onToggleTheme}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <a
            href="#"
            className="ml-1 hidden rounded-xl px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:block"
          >
            Sign In
          </a>
          <Link
            to="/buy"
            search={{}}
            className="bg-gradient-primary hidden rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 sm:block"
          >
            Get Started
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-secondary lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-up border-t border-border bg-background px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  to={link.to}
                  search={{}}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href="#"
              className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground"
            >
              Sign In
            </a>
            <Link
              to="/buy"
              search={{}}
              className="bg-gradient-primary rounded-xl px-4 py-2.5 text-center text-sm font-bold text-primary-foreground"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}