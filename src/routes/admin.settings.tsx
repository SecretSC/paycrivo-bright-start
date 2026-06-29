import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAdminAuth } from "@/lib/adminAuth";
import { CANNED_RESPONSES, initials } from "@/lib/admin-ui";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getAdminDefaultTheme,
  setAdminDefaultTheme,
  type DefaultTheme,
} from "@/lib/api/settings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function DefaultThemeSetting() {
  const [theme, setTheme] = useState<DefaultTheme>("dark");
  const [initial, setInitial] = useState<DefaultTheme>("dark");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminDefaultTheme()
      .then((t) => {
        if (!active) return;
        setTheme(t);
        setInitial(t);
      })
      .catch(() => {
        if (active) toast.error("Could not load the current default theme.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const dirty = theme !== initial;

  const save = async () => {
    setSaving(true);
    try {
      await setAdminDefaultTheme(theme);
      setInitial(theme);
      toast.success(`Default website theme set to ${theme === "dark" ? "Dark" : "Light"}.`);
    } catch {
      toast.error("Could not save the default theme. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const options: { value: DefaultTheme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Default Website Theme</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        The theme first-time visitors see before they pick their own. Visitors who change the
        theme keep their own choice — this only affects people with no saved preference.
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-muted/40 p-1" role="group" aria-label="Default website theme">
        {options.map((opt) => {
          const active = theme === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={loading}
              aria-pressed={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || loading}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {dirty && !saving ? (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        ) : null}
      </div>
    </section>
  );
}

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
          <p className="text-sm text-muted-foreground">Website settings, agent profile, notifications and canned responses.</p>
        </div>

        <DefaultThemeSetting />

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
