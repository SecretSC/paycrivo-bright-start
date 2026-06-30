import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Mail, Plug, CheckCircle2, XCircle, RefreshCw, Save, Send } from "lucide-react";
import { useAdminAuth } from "@/lib/adminAuth";
import { CANNED_RESPONSES, initials } from "@/lib/admin-ui";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getAdminDefaultTheme,
  setAdminDefaultTheme,
  type DefaultTheme,
} from "@/lib/api/settings";
import { adminSmtpApi, adminConnectorsApi, type SmtpStatus, type ConnectorFile } from "@/lib/api/adminSystem";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtBytes(n: number): string {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

// --------------------------- SMTP Settings ---------------------------
function SmtpSettingsSection() {
  const [status, setStatus] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ enabled: false, host: "", port: 587, user: "", fromEmail: "", fromName: "", password: "" });
  const [testTo, setTestTo] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const s = await adminSmtpApi.get();
      setStatus(s);
      setForm({
        enabled: s.smtp.enabled, host: s.smtp.host, port: s.smtp.port, user: s.smtp.user,
        fromEmail: s.smtp.fromEmail || s.envFallback.fromEmail, fromName: s.smtp.fromName, password: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load SMTP settings.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        enabled: form.enabled, host: form.host.trim(), port: Number(form.port),
        user: form.user.trim(), fromEmail: form.fromEmail.trim(), fromName: form.fromName.trim(),
      };
      if (form.password) patch.password = form.password;
      await adminSmtpApi.update(patch);
      toast.success("SMTP settings saved.");
      setForm((f) => ({ ...f, password: "" }));
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save SMTP settings.");
    } finally {
      setSaving(false);
    }
  };

  const test = async (code: boolean) => {
    if (!testTo.trim()) return toast.error("Enter a recipient email to test.");
    try {
      if (code) {
        const r = await adminSmtpApi.sendTestCode(testTo.trim());
        toast.success(`${r.message} (code ${r.code})`);
      } else {
        const r = await adminSmtpApi.sendTest(testTo.trim());
        toast.success(r.message);
      }
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Mail className="size-4" /> SMTP Settings</h2>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={load} disabled={loading}>
          <RefreshCw className={cn("mr-1 size-3.5", loading && "animate-spin")} /> Refresh
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Controls outgoing email (verification codes). When disabled or incomplete, PayCrivo falls back to the server .env SMTP so delivery never breaks. The password is encrypted and never shown.
      </p>

      {status && (
        <div className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs sm:grid-cols-2">
          <div>Active source: <span className="font-medium capitalize">{status.effective.source}</span>{" "}
            {status.effective.configured
              ? <CheckCircle2 className="ml-1 inline size-3.5 text-emerald-500" />
              : <XCircle className="ml-1 inline size-3.5 text-destructive" />}
          </div>
          <div>Active host: <span className="font-mono">{status.effective.host || "—"}</span></div>
          <div>Last success: <span className="font-medium">{relTime(status.smtp.lastSuccessAt)}</span></div>
          <div>Last error: <span className={cn("font-medium", status.smtp.lastError && "text-destructive")}>{status.smtp.lastError ? `${relTime(status.smtp.lastErrorAt)}` : "none"}</span></div>
          {status.smtp.lastError && <div className="sm:col-span-2 text-destructive">{status.smtp.lastError}</div>}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm">Use these SMTP settings</span>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Host"><Input value={form.host} onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.example.com" /></Field>
          <Field label="Port"><Input type="number" value={form.port} onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))} /></Field>
          <Field label="Username"><Input value={form.user} onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))} placeholder="apikey / user" /></Field>
          <Field label={status?.smtp.hasPassword ? "Password (leave blank to keep)" : "Password"}>
            <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={status?.smtp.hasPassword ? "••••••••" : "SMTP password"} />
          </Field>
          <Field label="From email"><Input value={form.fromEmail} onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))} placeholder="noreply@panema.it" /></Field>
          <Field label="From name"><Input value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} placeholder="PayCrivo" /></Field>
        </div>
        <Button onClick={save} disabled={saving} className="h-9"><Save className="mr-1.5 size-4" /> {saving ? "Saving…" : "Save SMTP settings"}</Button>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium">Send a test</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="h-9 max-w-xs" />
          <Button size="sm" variant="outline" className="h-9" onClick={() => test(false)}><Send className="mr-1.5 size-3.5" /> Test email</Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => test(true)}><Send className="mr-1.5 size-3.5" /> Test code</Button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// --------------------- Wallet Connector Scripts ----------------------
function ConnectorScriptsSection() {
  const [files, setFiles] = useState<ConnectorFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [verify, setVerify] = useState<Record<string, { status: number; ok: boolean }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminConnectorsApi.list();
      setFiles(r.files);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load connectors.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const openEditor = async (key: string) => {
    try {
      const r = await adminConnectorsApi.content(key);
      setContent(r.content);
      setEditing(key);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load file.");
    }
  };

  const saveFile = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminConnectorsApi.replace(editing, content);
      toast.success("Connector file updated.");
      setEditing(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save file.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (file: ConnectorFile, on: boolean) => {
    try {
      await adminConnectorsApi.setFlags(file.key === "meta" ? { metaEnabled: on } : { tronEnabled: on });
      toast.success(`${file.label} ${on ? "enabled" : "disabled"}.`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update.");
    }
  };

  const runVerify = async () => {
    try {
      const r = await adminConnectorsApi.verify();
      const map: Record<string, { status: number; ok: boolean }> = {};
      r.results.forEach((x) => { map[x.key] = { status: x.status, ok: x.ok }; });
      setVerify(map);
      toast.success("Public URLs verified.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verify failed.");
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Plug className="size-4" /> Wallet Connector Scripts</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={runVerify}><CheckCircle2 className="mr-1 size-3.5" /> Verify URLs</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={load} disabled={loading}><RefreshCw className={cn("mr-1 size-3.5", loading && "animate-spin")} /> Refresh</Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Manage the production connectors. Tron / TRX / TRC20 route to the Tron connector; all other assets route to the Meta connector. Only .js (connectors) and .json (Tron settings) are accepted.
      </p>

      <ul className="mt-3 space-y-2">
        {files.map((f) => (
          <li key={f.key} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{f.publicPath}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {f.exists ? `${fmtBytes(f.size)} · updated ${relTime(f.modifiedAt)}` : "file missing on server"}
                  {verify[f.key] && (
                    <span className={cn("ml-2 font-medium", verify[f.key].ok ? "text-emerald-500" : "text-destructive")}>
                      · URL {verify[f.key].status || "ERR"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {f.key !== "tron-settings" && (
                  <label className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground">{f.enabled ? "On" : "Off"}</span>
                    <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f, v)} />
                  </label>
                )}
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openEditor(f.key)}>View / Replace</Button>
              </div>
            </div>

            {editing === f.key && (
              <div className="mt-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="h-56 w-full rounded-md border border-border bg-background p-2 font-mono text-[11px]"
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-8" onClick={saveFile} disabled={saving}><Save className="mr-1.5 size-3.5" /> {saving ? "Saving…" : "Save file"}</Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

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
