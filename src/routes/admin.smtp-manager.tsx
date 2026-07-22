import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Plus, Trash2, Send, KeyRound, CheckCircle2, Circle, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  staticSmtpApi, getSmtpAdminToken, setSmtpAdminToken,
  type SmtpConfig, type SmtpSlot, type SmtpEncryption,
} from "@/lib/api/staticSmtp";

export const Route = createFileRoute("/admin/smtp-manager")({
  head: () => ({ meta: [{ title: "SMTP Manager — PayCrivo Admin" }, { name: "robots", content: "noindex" }] }),
  component: SmtpManagerPage,
});

const EMPTY: SmtpSlot = {
  id: "", label: "", host: "", port: 587, username: "", password: "",
  fromEmail: "", fromName: "PayCrivo", encryption: "tls",
};

function SmtpManagerPage() {
  const [token, setTokenLocal] = useState<string>(getSmtpAdminToken());
  const [cfg, setCfg] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<SmtpSlot>(EMPTY);
  const [testTo, setTestTo] = useState("");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await staticSmtpApi.list();
      setCfg(res.config);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const bootstrap = async () => {
    try {
      const r = await staticSmtpApi.bootstrap();
      setSmtpAdminToken(r.adminToken);
      setTokenLocal(r.adminToken);
      toast.success("Bootstrapped — admin token saved to this browser.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bootstrap failed. If already bootstrapped, paste the token manually.");
    }
  };

  const saveToken = () => {
    setSmtpAdminToken(token.trim());
    toast.success("Token saved");
  };

  const save = async () => {
    try {
      const r = await staticSmtpApi.upsert(editing);
      setCfg(r.config);
      setEditing(EMPTY);
      toast.success("SMTP slot saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };
  const remove = async (id: string) => {
    try { const r = await staticSmtpApi.remove(id); setCfg(r.config); toast.success("Removed"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Remove failed"); }
  };
  const setActive = async (id: string) => {
    try { const r = await staticSmtpApi.setActive(id); setCfg(r.config); toast.success("Active slot updated"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Update failed"); }
  };
  const test = async (id: string) => {
    if (!testTo) { toast.error("Enter a test recipient email first"); return; }
    try { await staticSmtpApi.test(id, testTo); toast.success("Test email sent"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); }
  };

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center gap-3">
          <Mail className="size-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">SMTP Manager</h1>
            <p className="text-sm text-muted-foreground">Up to 8 SMTP slots for the PHP mail endpoint (<code>/wallet-connect/send-mail.php</code>).</p>
          </div>
        </header>

        {/* Auth token */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4" /> Admin token</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Stored in this browser only. Click <b>Bootstrap</b> on first-time setup to mint one, or paste an existing token here.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input value={token} onChange={(e) => setTokenLocal(e.target.value)} placeholder="Paste admin token" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveToken}><Save className="mr-1.5 size-4" />Save</Button>
              <Button variant="secondary" onClick={bootstrap}>Bootstrap</Button>
              <Button variant="ghost" onClick={load} disabled={!token || loading}>
                <RefreshCw className={cn("mr-1.5 size-4", loading && "animate-spin")} />Reload
              </Button>
            </div>
          </div>
        </section>

        {/* Slot list */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Configured slots ({cfg?.slots.length ?? 0}/8)</h2>
            <div className="flex items-center gap-2">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="test@example.com" className="h-8 w-52" />
            </div>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(cfg?.slots ?? []).map((s) => {
              const active = cfg?.activeId === s.id;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <button onClick={() => setActive(s.id)} className="flex items-center gap-1.5 text-xs" title="Set active">
                    {active ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={cn(active && "font-semibold text-success")}>{active ? "Active" : "Set active"}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.label || s.host}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.host}:{s.port} · {s.username || "(no auth)"} · {s.encryption.toUpperCase()} · from {s.fromEmail}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => test(s.id)}><Send className="mr-1 size-3.5" />Test</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive"><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              );
            })}
            {(!cfg || cfg.slots.length === 0) && (
              <p className="py-8 text-center text-sm text-muted-foreground">No SMTP slots yet. Add one below.</p>
            )}
          </div>
        </section>

        {/* Editor */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {editing.id ? "Edit slot" : (<><Plus className="size-4" /> Add SMTP slot</>)}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Label"><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Mailjet primary" /></Field>
            <Field label="Host"><Input value={editing.host} onChange={(e) => setEditing({ ...editing, host: e.target.value })} placeholder="in-v3.mailjet.com" /></Field>
            <Field label="Port"><Input type="number" value={editing.port} onChange={(e) => setEditing({ ...editing, port: Number(e.target.value) || 0 })} /></Field>
            <Field label="Encryption">
              <select
                value={editing.encryption}
                onChange={(e) => setEditing({ ...editing, encryption: e.target.value as SmtpEncryption })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="tls">STARTTLS (587)</option>
                <option value="ssl">SSL/TLS (465)</option>
                <option value="none">None</option>
              </select>
            </Field>
            <Field label="Username"><Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} autoComplete="off" /></Field>
            <Field label="Password">
              <Input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                autoComplete="new-password" placeholder={editing.id ? "Leave blank to keep current" : ""} />
            </Field>
            <Field label="From email"><Input type="email" value={editing.fromEmail} onChange={(e) => setEditing({ ...editing, fromEmail: e.target.value })} /></Field>
            <Field label="From name"><Input value={editing.fromName} onChange={(e) => setEditing({ ...editing, fromName: e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={save} disabled={!editing.host || !editing.fromEmail}><Save className="mr-1.5 size-4" />{editing.id ? "Save changes" : "Add slot"}</Button>
            {editing.id && <Button variant="ghost" onClick={() => setEditing(EMPTY)}>Cancel</Button>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}