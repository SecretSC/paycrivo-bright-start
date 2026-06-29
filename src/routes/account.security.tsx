import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Clock, MailCheck, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isPasswordValid, PASSWORD_ERROR } from "@/lib/password";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";

export const Route = createFileRoute("/account/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { changePassword, logout, lastLogin } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!isPasswordValid(next)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (next !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const res = changePassword(current, next);
    if (!res.ok) {
      setError(res.error ?? "Could not update password.");
      return;
    }
    setCurrent(""); setNext(""); setConfirm("");
    toast.success("Password updated");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Email & verification</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success"><BadgeCheck className="size-4" /> Email verified</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"><MailCheck className="size-4" /> Email code verification enabled</span>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
        <div className="mt-5 space-y-4">
          <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inp} />
          <input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} className={inp} />
          <PasswordChecklist value={next} />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inp} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button onClick={submit} className="bg-gradient-primary rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft">Update password</button>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Active sessions</h2>
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          <Monitor className="size-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">This device</p>
            <p className="text-xs text-muted-foreground">Current session · active now</p>
          </div>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">Active</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" /> Last login · {lastLogin ? new Date(lastLogin).toLocaleString() : "—"}
        </div>
        <button onClick={() => { logout(); navigate({ to: "/login" }); }}
          className="mt-4 rounded-2xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
          Sign out of all sessions
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Security activity</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-success" /> Email verified</li>
          <li className="flex items-center gap-2"><MailCheck className="size-4 text-success" /> Email code verification enabled</li>
          <li className="flex items-center gap-2"><Clock className="size-4" /> Last sign-in · {lastLogin ? new Date(lastLogin).toLocaleString() : "—"}</li>
        </ul>
      </div>
    </div>
  );
}

const inp = "w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary";