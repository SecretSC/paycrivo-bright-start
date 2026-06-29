import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { adminDirectory } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { fmtDateTime } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/rewards")({ component: Rewards });

function Rewards() {
  const fetcher = useCallback(() => adminDirectory.rewards(), []);
  const { data } = useRealtimePoll("admin:rewards", fetcher, { intervalMs: 6000 });
  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Reward Claims</h1>
          <p className="text-sm text-muted-foreground">$20 welcome reward claims.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {(data ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  ${r.amountUsd} · {r.selectedAsset ?? "—"} {r.selectedNetwork ? `(${r.selectedNetwork})` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={cn("rounded-full border border-border px-2 py-0.5 text-[11px] capitalize")}>{r.status}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{fmtDateTime(r.createdAt)}</span>
              </div>
            </div>
          ))}
          {(!data || data.length === 0) && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No reward claims to display.</p>
          )}
        </div>
      </div>
    </div>
  );
}
