import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Globe, LayoutDashboard, LogOut, Menu, Moon, Receipt, Shield, Sun, User, Wallet, X } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks: { label: string; to?: string; href?: string }[] = [
  { label: "Buy Crypto", to: "/buy-crypto" },
  { label: "Swap Crypto", to: "/exchange" },
  { label: "Prices", to: "/prices" },
  { label: "Learn", to: "/learn" },
];

export function Header({ theme, onToggleTheme }: { theme: string; onToggleTheme: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-1 hidden items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:flex">
                <span className="bg-gradient-primary grid size-6 place-items-center rounded-full text-xs font-bold text-primary-foreground">
                  {(user?.firstName?.[0] ?? "P").toUpperCase()}
                </span>
                {user?.firstName || "Account"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  <LayoutDashboard className="size-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account/orders" })}>
                  <Receipt className="size-4" /> Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account/wallets" })}>
                  <Wallet className="size-4" /> Wallets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account/security" })}>
                  <Shield className="size-4" /> Security
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
                  <User className="size-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                to="/login"
                className="ml-1 hidden rounded-xl px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:block"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-primary hidden rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 sm:block"
              >
                Get Started
              </Link>
            </>
          )}
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
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground">
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-primary rounded-xl px-4 py-2.5 text-center text-sm font-bold text-primary-foreground"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}