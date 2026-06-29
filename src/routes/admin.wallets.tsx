import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { adminDirectory } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { fmtDateTime } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/wallets")({ component: Wallets });

function Wallets() {
  const fetcher = useCallback(() => adminDirectory.wallets(), []);
  const { data } = useRealtimePoll("admin:wallets", fetcher, { intervalMs: 8000 });
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Saved Wallets</h1>
          <p className="text-sm text-muted-foreground">Addresses are shortened — full values never leave the backend.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {(data ?? []).map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{w.coin}{w.network ? ` · ${w.network}` : ""}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{w.address}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(w.createdAt)}</span>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No saved wallets to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}
