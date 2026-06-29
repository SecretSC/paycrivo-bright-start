import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Gift, Receipt, Shield, User, Wallet } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { RequireAuth } from "@/components/auth/RequireAuth";

export const Route = createFileRoute("/account")({
  component: () => (
    <RequireAuth>
      <AccountLayout />
    </RequireAuth>
  ),
});

const links = [
  { to: "/account", label: "Profile", icon: User, exact: true },
  { to: "/account/security", label: "Security", icon: Shield, exact: false },
  { to: "/account/wallets", label: "Wallets", icon: Wallet, exact: false },
  { to: "/account/orders", label: "Orders", icon: Receipt, exact: false },
  { to: "/account/reward", label: "Reward", icon: Gift, exact: false },
] as const;

function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageChrome>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Account</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {links.map((l) => {
              const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
              return (
                <Link key={l.to} to={l.to}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <l.icon className="size-4" /> {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </PageChrome>
  );
}