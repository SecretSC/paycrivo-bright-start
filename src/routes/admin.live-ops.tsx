import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  Activity, Users, ShoppingCart, ArrowLeftRight, MessageSquare, Clock, UserPlus,
  ShieldAlert, Wallet, KeyRound, Gift, Search, LifeBuoy, ExternalLink, Compass,
  Eye, CheckCircle2, AlertTriangle, Mail, ServerCog, Plug,
} from "lucide-react";
import { toast } from "sonner";
import { adminLiveApi } from "@/lib/api/adminLive";
import { setNeedsHelp } from "@/lib/liveLog";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fmtDateTime, relativeTime, initials, STATUS_LABELS, STATUS_STYLES,
  PRIORITY_LABELS, PRIORITY_STYLES, TOPIC_LABELS,
} from "@/lib/admin-ui";
import type {
  LiveVisitor, LiveVisitorStatus, LiveOpsEvent, LiveOpsEventType, ServiceHealth, LiveOpsSnapshot,
} from "@/lib/api/types";

export const Route = createFileRoute("/admin/live-ops")({ component: LiveOps });

const VISITOR_STATUS_STYLES: Record<LiveVisitorStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  idle: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  abandoned: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-sky-500/15 text-sky-500 border-sky-500/30",
};

const FLOW_STYLES: Record<string, string> = {
  buy: "bg-primary/15 text-primary border-primary/30",
  exchange: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  account: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  reward: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  support: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  browsing: "bg-muted text-muted-foreground border-border",
};

const EVENT_ICON: Record<LiveOpsEventType, React.ComponentType<{ className?: string }>> = {
  page_view: Eye,
  checkout_started: ShoppingCart,
  email_entered: Mail,
  email_verified: CheckCircle2,
  wallet_step: Wallet,
  wallet_validation_failed: AlertTriangle,
  ownership_confirmed: ShieldAlert,
  order_created: CheckCircle2,
  support_opened: LifeBuoy,
  ticket_created: MessageSquare,
  otp_failed: KeyRound,
  reward_claim: Gift,
  nav_suggestion: Compass,
};

const EVENT_TONE: Partial<Record<LiveOpsEventType, string>> = {
  wallet_validation_failed: "text-destructive",
  otp_failed: "text-destructive",
  order_created: "text-emerald-500",
  email_verified: "text-emerald-500",
};

const HEALTH_STYLES: Record<ServiceHealth, string> = {
  operational: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  down: "bg-destructive/15 text-destructive border-destructive/30",
};
const HEALTH_LABEL: Record<ServiceHealth, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", className)}>
      {children}
    </span>
  );
}

function MetricCard({
  icon: Icon, label, value, tone,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center justify-between">
        <span className={cn("grid size-8 place-items-center rounded-lg bg-muted", tone)}>
          <Icon className="size-4" />
        </span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function LiveOps() {
  const navigate = useNavigate();
  const fetcher = useCallback(() => adminLiveApi.snapshot(), []);
  const { data } = useRealtimePoll<LiveOpsSnapshot>("admin:live-ops", fetcher, { intervalMs: 2500 });
  const [q, setQ] = useState("");
  const [flowFilter, setFlowFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const snap = data;
  const m = snap?.metrics;

  const visitors = useMemo(() => {
    let list = snap?.visitors ?? [];
    if (flowFilter !== "all") list = list.filter((v) => v.flow === flowFilter);
    if (statusFilter !== "all") list = list.filter((v) => v.status === statusFilter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((v) =>
        `${v.sessionId} ${v.email ?? ""} ${v.currentPage} ${v.flow} ${v.selectedAsset ?? ""}`.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [snap, flowFilter, statusFilter, q]);

  const openTicketFor = (email?: string | null) =>
    navigate({ to: "/admin/conversations", search: { status: "all", q: email ?? "" } });
  const openCustomer = (email?: string | null) => navigate({ to: "/admin/customers", search: { q: email ?? "" } as never });
  const openOrders = () => navigate({ to: "/admin/orders" });

  const markHelp = (v: LiveVisitor) => {
    setNeedsHelp(v.sessionId, !v.needsHelp);
    toast.success(v.needsHelp ? "Removed help flag" : "Flagged session as needs help");
  };
  const sendSuggestion = async (v: LiveVisitor) => {
    const to = v.flow === "exchange" ? "/exchange" : "/buy";
    await adminLiveApi.sendSuggestion(v.sessionId, to, "PayCrivo Support suggests continuing here.");
    toast.success("Navigation suggestion sent");
  };

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              <Activity className="size-4.5" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Live Operations</h1>
              <p className="text-xs text-muted-foreground">Real-time activity across PayCrivo</p>
            </div>
          </div>
          {/* Health */}
          <div className="flex flex-wrap items-center gap-2">
            <HealthChip icon={ServerCog} label="API" status={snap?.health.api ?? "operational"} />
            <HealthChip icon={Mail} label="SMTP" status={snap?.health.smtp ?? "operational"} />
            <HealthChip icon={Plug} label="Backend" status={snap?.health.backend ?? "operational"} />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <MetricCard icon={Users} label="Active visitors" value={m?.activeVisitors ?? 0} tone="text-emerald-500" />
          <MetricCard icon={ShoppingCart} label="Buy checkouts" value={m?.activeBuyCheckouts ?? 0} tone="text-primary" />
          <MetricCard icon={ArrowLeftRight} label="Exchange checkouts" value={m?.activeExchangeCheckouts ?? 0} tone="text-violet-400" />
          <MetricCard icon={MessageSquare} label="Open support chats" value={m?.openSupportChats ?? 0} tone="text-sky-500" />
          <MetricCard icon={Clock} label="Waiting tickets" value={m?.waitingTickets ?? 0} tone="text-amber-500" />
          <MetricCard icon={UserPlus} label="Recent signups" value={m?.recentSignups ?? 0} tone="text-sky-500" />
          <MetricCard icon={CheckCircle2} label="Recent orders" value={m?.recentOrders ?? 0} tone="text-emerald-500" />
          <MetricCard icon={ShieldAlert} label="Failed validations" value={m?.failedValidations ?? 0} tone="text-destructive" />
          <MetricCard icon={Wallet} label="Wallet errors" value={m?.walletValidationErrors ?? 0} tone="text-destructive" />
          <MetricCard icon={KeyRound} label="OTP failures" value={m?.otpFailures ?? 0} tone="text-destructive" />
          <MetricCard icon={Gift} label="Reward claims" value={m?.rewardClaims ?? 0} tone="text-amber-500" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Visitors + Orders + Support (2 cols) */}
          <div className="space-y-5 xl:col-span-2">
            {/* Live visitors */}
            <section className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="size-4 text-muted-foreground" /> Live visitors
                  <Badge className="bg-muted text-muted-foreground border-border">{visitors.length}</Badge>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-8 w-40 pl-8 text-xs" />
                  </div>
                  <select value={flowFilter} onChange={(e) => setFlowFilter(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                    <option value="all">All flows</option>
                    <option value="buy">Buy</option>
                    <option value="exchange">Exchange</option>
                    <option value="account">Account</option>
                    <option value="reward">Reward</option>
                    <option value="browsing">Browsing</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="abandoned">Abandoned</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="max-h-[420px] divide-y divide-border overflow-y-auto">
                {visitors.map((v) => (
                  <div key={v.sessionId} className="p-3 hover:bg-muted/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className={FLOW_STYLES[v.flow]}>{v.flow}</Badge>
                          <Badge className={VISITOR_STATUS_STYLES[v.status]}>{v.status}</Badge>
                          {v.needsHelp && <Badge className="bg-destructive/15 text-destructive border-destructive/30">needs help</Badge>}
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{v.email ?? "Anonymous visitor"}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{v.sessionId}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {v.currentPage}{v.step ? ` · ${v.step}` : ""}
                          {v.selectedAsset ? ` · ${v.selectedAsset}` : ""}{v.selectedFiat ? `/${v.selectedFiat}` : ""}
                        </p>
                        {v.personal && (v.personal.firstName || v.personal.lastName || v.personal.phone) && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {[v.personal.firstName, v.personal.lastName].filter(Boolean).join(" ")}
                            {v.personal.phone ? ` · ${v.personal.phone}` : ""}
                            {v.personal.emailVerified ? " · ✓ verified" : ""}
                          </p>
                        )}
                        {v.order && (
                          <p className="mt-0.5 truncate text-[11px] text-primary">
                            {v.order.reference} · {v.order.amount ?? ""} {v.order.fiat ?? ""}
                            {v.order.asset ? ` → ${v.order.asset}` : ""}{v.order.network ? ` (${v.order.network})` : ""} · {v.order.status}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {v.country ? `${v.country} · ` : ""}{v.device} · {v.browser} · {relativeTime(v.lastActivity)}
                          {v.lastAction ? ` · ${v.lastAction}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <Button size="sm" variant="ghost" className="h-7 justify-start px-2 text-xs" onClick={() => openTicketFor(v.email)}>
                          <LifeBuoy className="mr-1 size-3.5" /> Ticket
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 justify-start px-2 text-xs" onClick={() => openCustomer(v.email)}>
                          <Users className="mr-1 size-3.5" /> Profile
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 justify-start px-2 text-xs" onClick={() => markHelp(v)}>
                          <ShieldAlert className="mr-1 size-3.5" /> {v.needsHelp ? "Unflag" : "Needs help"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 justify-start px-2 text-xs" onClick={() => sendSuggestion(v)}>
                          <Compass className="mr-1 size-3.5" /> Suggest
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {visitors.length === 0 && (
                  <p className="px-3 py-10 text-center text-sm text-muted-foreground">No live visitors right now.</p>
                )}
              </div>
            </section>

            {/* Order activity */}
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="size-4 text-muted-foreground" /> Order activity
                </h2>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={openOrders}>
                  View all <ExternalLink className="ml-1 size-3.5" />
                </Button>
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto">
                {(snap?.orders ?? []).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge className={FLOW_STYLES[o.type]}>{o.type}</Badge>
                        <span className="font-mono text-xs">{o.reference}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {o.email} · {o.type === "buy" ? `${o.spendAmount ?? ""} ${o.fiat ?? ""} → ${o.coin ?? o.receiveCoin ?? ""}` : `${o.sendCoin ?? ""} → ${o.receiveCoin ?? ""}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmtDateTime(o.createdAt)}</p>
                    </div>
                    <Badge className="bg-muted text-muted-foreground border-border">{o.status}</Badge>
                  </div>
                ))}
                {(snap?.orders ?? []).length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">No recent orders.</p>
                )}
              </div>
            </section>

            {/* Support activity */}
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4 text-muted-foreground" /> Support activity
                </h2>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate({ to: "/admin/conversations", search: { status: "all" } })}>
                  Open inbox <ExternalLink className="ml-1 size-3.5" />
                </Button>
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto">
                {(snap?.tickets ?? []).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate({ to: "/admin/conversations", search: { status: "all", ticket: t.id } as never })}
                    className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs">{t.ticketNumber}</span>
                        <Badge className={STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground border-border"}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </Badge>
                        <Badge className={PRIORITY_STYLES[t.priority ?? "medium"]}>{PRIORITY_LABELS[t.priority ?? "medium"]}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t.customerName ?? t.email ?? "Guest"} · {TOPIC_LABELS[t.topic] ?? t.topic}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.assignedAdminName ? `Assigned to ${t.assignedAdminName}` : "Unassigned"} · {relativeTime(t.lastMessageAt)}
                      </p>
                    </div>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                      {initials(t.customerName, t.email)}
                    </span>
                  </button>
                ))}
                {(snap?.tickets ?? []).length === 0 && (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">No support activity.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right: event timeline + signups */}
          <div className="space-y-5">
            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border p-3">
                <Activity className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Live event timeline</h2>
              </div>
              <div className="max-h-[560px] overflow-y-auto p-3">
                <ol className="relative space-y-3 border-l border-border pl-4">
                  {(snap?.events ?? []).map((ev: LiveOpsEvent) => {
                    const Icon = EVENT_ICON[ev.type] ?? Eye;
                    return (
                      <li key={ev.id} className="relative">
                        <span className={cn("absolute -left-[1.42rem] grid size-5 place-items-center rounded-full border border-border bg-card", EVENT_TONE[ev.type] ?? "text-muted-foreground")}>
                          <Icon className="size-3" />
                        </span>
                        <p className={cn("text-xs font-medium", EVENT_TONE[ev.type])}>{ev.label}</p>
                        {ev.email && <p className="truncate text-[11px] text-muted-foreground">{ev.email}</p>}
                        <p className="text-[11px] text-muted-foreground">{relativeTime(ev.createdAt)}</p>
                      </li>
                    );
                  })}
                  {(snap?.events ?? []).length === 0 && (
                    <li className="text-xs text-muted-foreground">No events captured yet.</li>
                  )}
                </ol>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border p-3">
                <UserPlus className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Recent signups</h2>
              </div>
              <div className="divide-y divide-border">
                {(snap?.signups ?? []).map((s) => (
                  <div key={s.email + s.createdAt} className="flex items-center justify-between gap-2 p-3">
                    <p className="truncate text-xs font-medium">{s.email}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(s.createdAt)}</span>
                  </div>
                ))}
                {(snap?.signups ?? []).length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">No recent signups.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthChip({
  icon: Icon, label, status,
}: { icon: React.ComponentType<{ className?: string }>; label: string; status: ServiceHealth }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", HEALTH_STYLES[status])}>
      <Icon className="size-3.5" />
      {label}: {HEALTH_LABEL[status]}
    </span>
  );
}
