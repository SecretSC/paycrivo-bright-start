import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { adminDirectory } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { fmtDateTime } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({ component: Orders });

function Orders() {
  const fetcher = useCallback(() => adminDirectory.orders(), []);
  const { data } = useRealtimePoll("admin:orders", fetcher, { intervalMs: 6000 });
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Buy &amp; exchange orders across all customers.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Reference</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-mono text-xs">{o.reference}</td>
                  <td className="px-4 py-2.5 capitalize">{o.type}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{o.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("rounded-full border border-border px-2 py-0.5 text-[11px] capitalize")}>{o.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data || data.length === 0) && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No orders to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}
