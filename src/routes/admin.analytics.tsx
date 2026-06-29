import { createFileRoute } from "@tanstack/react-router";
import { adminApi } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";

export const Route = createFileRoute("/admin/analytics")({ component: Analytics });

function Analytics() {
  const { data } = useRealtimePoll("admin:analytics", () => adminApi.stats(), { intervalMs: 5000 });
  const items = [
    { label: "Open tickets", value: data?.openTickets ?? 0 },
    { label: "Resolved today", value: data?.resolvedToday ?? 0 },
    { label: "Waiting customers", value: data?.waitingCustomers ?? 0 },
    { label: "Active agents", value: data?.activeAgents ?? 0 },
    { label: "Online visitors", value: data?.onlineVisitors ?? 0 },
    { label: "Average response time", value: `${data?.avgResponseMins ?? 0} min` },
    { label: "Average resolution time", value: `${data?.avgResolutionMins ?? 0} min` },
  ];
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Support performance at a glance.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((i) => (
            <div key={i.label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{i.label}</p>
              <p className="mt-1 text-2xl font-semibold">{i.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
