import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { adminDirectory } from "@/lib/api/admin";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import { Input } from "@/components/ui/input";
import { fmtDateTime, initials } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/customers")({ component: Customers });

function Customers() {
  const [q, setQ] = useState("");
  const [committed, setCommitted] = useState("");
  const fetcher = useCallback(() => adminDirectory.customers(committed), [committed]);
  const { data } = useRealtimePoll(`admin:customers:${committed}`, fetcher, { intervalMs: 6000 });

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Customer Search</h1>
          <p className="text-sm text-muted-foreground">Find customers by name or email.</p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setCommitted(q)}
            placeholder="Search name or email…"
            className="pl-8"
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {(data ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {initials(c.name, c.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <p>{c.country ?? "—"}</p>
                  <p>{fmtDateTime(c.createdAt)}</p>
                </div>
              </div>
            ))}
            {(!data || data.length === 0) && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No customers found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
