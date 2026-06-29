import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminAuth } from "@/lib/adminAuth";
import { CANNED_RESPONSES, initials } from "@/lib/admin-ui";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  const { admin } = useAdminAuth();
  const [sound, setSound] = useState(true);
  const [desktop, setDesktop] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");

  const requestDesktop = async (on: boolean) => {
    if (on && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const res = await Notification.requestPermission();
      setDesktop(res === "granted");
      if (res !== "granted") toast.error("Desktop notifications were blocked by your browser.");
      return;
    }
    setDesktop(on);
  };

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Agent profile, notifications and canned responses.</p>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Agent profile</h2>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-muted text-sm font-semibold">
              {initials(admin?.name, admin?.email)}
            </span>
            <div>
              <p className="text-sm font-medium">{admin?.name}</p>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
              <p className="text-xs capitalize text-muted-foreground">{admin?.role?.replace(/_/g, " ")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Notifications</h2>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm">New message sound</span>
            <Switch checked={sound} onCheckedChange={setSound} />
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm">Desktop notifications</span>
            <Switch checked={desktop} onCheckedChange={requestDesktop} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Canned responses</h2>
          <ul className="space-y-2">
            {CANNED_RESPONSES.map((c) => (
              <li key={c.label} className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-foreground">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
