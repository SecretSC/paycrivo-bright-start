import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, Clock, CheckCircle2, Timer, Users, Wifi, Gauge } from "lucide-react";
import { adminApi } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import {
  STATUS_LABELS, STATUS_STYLES, PRIORITY_LABELS, PRIORITY_STYLES, TOPIC_LABELS, relativeTime, initials,
} from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats } = useRealtimePoll("admin:stats", () => adminApi.stats(), { intervalMs: 5000 });
  const { data: recent } = useRealtimePoll("admin:recent", () => adminApi.listTickets({ status: "all" }), {
    intervalMs: 3000,
  });

  const cards = [
    { label: "Open tickets", value: stats?.openTickets ?? 0, icon: Inbox, tone: "text-primary" },
    { label: "Waiting customers", value: stats?.waitingCustomers ?? 0, icon: Clock, tone: "text-amber-500" },
    { label: "Resolved today", value: stats?.resolvedToday ?? 0, icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Online visitors", value: stats?.onlineVisitors ?? 0, icon: Wifi, tone: "text-sky-500" },
    { label: "Active agents", value: stats?.activeAgents ?? 0, icon: Users, tone: "text-foreground" },
    { label: "Avg response", value: `${stats?.avgResponseMins ?? 0}m`, icon: Timer, tone: "text-foreground" },
    { label: "Avg resolution", value: `${stats?.avgResolutionMins ?? 0}m`, icon: Gauge, tone: "text-foreground" },
  ];

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Support Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of conversations and customer activity.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <c.icon className={cn("size-4", c.tone)} />
              </div>
              <p className="mt-2 text-2xl font-semibold">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent conversations</h2>
            <Link to="/admin/conversations" search={{ status: "all" }} className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(recent ?? []).slice(0, 8).map((t) => (
              <Link
                key={t.id}
                to="/admin/conversations"
                search={{ status: "all", ticket: t.id }}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {initials(t.customerName, t.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.customerName ?? t.email ?? "Guest visitor"}</p>
                  <p className="truncate text-xs text-muted-foreground">{TOPIC_LABELS[t.topic] ?? t.topic} · {t.ticketNumber}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", PRIORITY_STYLES[t.priority ?? "medium"])}>
                    {PRIORITY_LABELS[t.priority ?? "medium"]}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[t.status])}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">{relativeTime(t.lastMessageAt)}</span>
                </div>
              </Link>
            ))}
            {(!recent || recent.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No conversations yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
