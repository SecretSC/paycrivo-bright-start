import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, MessagesSquare, Inbox, Clock, UserCheck, CheckCircle2,
  Search, ShoppingCart, Wallet, Gift, BarChart3, Settings, LogOut, Headset, Menu, ShieldCheck,
} from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/lib/adminAuth";
import { adminApi } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "PayCrivo Support Center" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AdminAuthProvider>
      <AdminGate />
    </AdminAuthProvider>
  ),
});

function AdminGate() {
  const { admin, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!admin) return <AdminLogin />;
  return <AdminShell />;
}

function AdminLogin() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
            <Headset className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">PayCrivo Support</p>
            <p className="text-xs text-muted-foreground">Agent sign in</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="a-email">Work email</Label>
            <Input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-pass">Password</Label>
            <Input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Restricted area — authorized agents only.
        </p>
      </div>
    </div>
  );
}

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  search?: Record<string, string>;
  badge?: "open" | "pending";
};

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  { label: "Live Conversations", icon: MessagesSquare, to: "/admin/conversations", search: { status: "all" } },
  { label: "Open Tickets", icon: Inbox, to: "/admin/conversations", search: { status: "open" }, badge: "open" },
  { label: "Waiting", icon: Clock, to: "/admin/conversations", search: { status: "pending" }, badge: "pending" },
  { label: "Assigned to Me", icon: UserCheck, to: "/admin/conversations", search: { assigned: "me" } },
  { label: "Closed", icon: CheckCircle2, to: "/admin/conversations", search: { status: "closed" } },
  { label: "Customer Search", icon: Search, to: "/admin/customers" },
  { label: "Orders", icon: ShoppingCart, to: "/admin/orders" },
  { label: "Wallets", icon: Wallet, to: "/admin/wallets" },
  { label: "Rewards", icon: Gift, to: "/admin/rewards" },
  { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
  { label: "Settings", icon: Settings, to: "/admin/settings" },
];

function SidebarContent({ counts, onNavigate }: { counts: { open: number; pending: number }; onNavigate?: () => void }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string> });

  const isActive = (item: NavItem) => {
    if (item.to !== path) return false;
    if (!item.search) return item.to === "/admin" ? path === "/admin" : true;
    return Object.entries(item.search).every(([k, v]) => (search?.[k] ?? (k === "status" ? "all" : "")) === v);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
          <Headset className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Support Center</p>
          <p className="truncate text-[11px] text-muted-foreground">PayCrivo</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = isActive(item);
          const badge = item.badge === "open" ? counts.open : item.badge === "pending" ? counts.pending : 0;
          return (
            <Link
              key={item.label}
              to={item.to}
              search={item.search}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && badge > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">{badge}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2.5 px-1">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {initials(admin?.name, admin?.email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{admin?.name}</p>
            <p className="truncate text-[11px] capitalize text-muted-foreground">{admin?.role?.replace(/_/g, " ")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={async () => {
            await logout();
            navigate({ to: "/admin" });
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data } = useRealtimePoll("admin:nav-counts", () => adminApi.stats(), { intervalMs: 5000 });
  const counts = useMemo(
    () => ({ open: data?.openTickets ?? 0, pending: data?.waitingCustomers ?? 0 }),
    [data],
  );

  // ensure desktop notification permission is requested once for live alerts
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <SidebarContent counts={counts} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent counts={counts} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <span className="text-sm font-semibold">PayCrivo Support Center</span>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
