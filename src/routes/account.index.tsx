import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, KeyRound, Mail, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { FiatSelector } from "@/components/paycrivo/FiatSelector";
import { OtpVerify } from "@/components/auth/OtpVerify";
import { sendCode } from "@/lib/email-otp";

export const Route = createFileRoute("/account/")({
  component: ProfilePage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ProfilePage() {
  const { user, updateProfile, updateEmail } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [fiat, setFiat] = useState(user?.preferredFiat ?? "USD");
  const [language, setLanguage] = useState(user?.language ?? "English");
  const [notifyOrders, setNotifyOrders] = useState(user?.notifyOrders ?? true);
  const [notifySecurity, setNotifySecurity] = useState(user?.notifySecurity ?? true);
  const [notifyRewards, setNotifyRewards] = useState(user?.notifyRewards ?? true);

  // Email change flow
  const [newEmail, setNewEmail] = useState("");
  const [emailStage, setEmailStage] = useState<"idle" | "otp">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const created = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";

  const save = () => {
    updateProfile({ phone, preferredFiat: fiat, language, notifyOrders, notifySecurity, notifyRewards });
    toast.success("Profile updated");
  };

  const startEmailChange = async () => {
    setEmailError(null);
    const e = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) { setEmailError("Enter a valid email address."); return; }
    if (e === user?.email) { setEmailError("That's already your email."); return; }
    await sendCode(e, "signup");
    setEmailStage("otp");
  };

  return (
    <div className="space-y-6">
      {/* Account information */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-foreground">Account information</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success"><BadgeCheck className="size-4" /> Email verified</span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Customer ID"><Readonly value={user?.id ?? ""} /></Field>
          <Field label="Account created"><Readonly value={created} /></Field>
          <Field label="First name (locked)"><Readonly value={user?.firstName ?? ""} /></Field>
          <Field label="Last name (locked)"><Readonly value={user?.lastName ?? ""} /></Field>
          <Field label="Country (locked)"><Readonly value={user?.country ?? ""} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Legal name and country are read-only. Contact support for changes.</p>

        {/* Email change */}
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Mail className="size-4" /> Email address</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {emailStage === "idle" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="New email address" className={`${inp} flex-1`} />
              <button onClick={startEmailChange} className="rounded-2xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary">Change email</button>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Verify {newEmail}</p>
                <button onClick={() => { setEmailStage("idle"); setNewEmail(""); }} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
              </div>
              <OtpVerify
                email={newEmail.trim().toLowerCase()}
                purpose="signup"
                autoSend={false}
                title="Confirm your new email"
                onVerified={() => {
                  const res = updateEmail(newEmail);
                  if (!res.ok) { toast.error(res.error ?? "Could not change email."); return; }
                  setEmailStage("idle"); setNewEmail("");
                  toast.success("Email updated");
                }}
              />
            </div>
          )}
          {emailError && <p className="mt-2 text-sm text-destructive">{emailError}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Changing your email requires verification before it becomes active.</p>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Preferences</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Preferred fiat"><FiatSelector value={fiat} onChange={setFiat} /></Field>
          <Field label="Language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inp}>
              {["English", "Dansk", "Deutsch", "Español", "Français", "Italiano"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
          <Toggle label="Order updates" checked={notifyOrders} onChange={setNotifyOrders} />
          <Toggle label="Security alerts" checked={notifySecurity} onChange={setNotifySecurity} />
          <Toggle label="Reward updates" checked={notifyRewards} onChange={setNotifyRewards} />
        </div>
        <button onClick={save} className="bg-gradient-primary mt-6 rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft">Save changes</button>
      </div>

      {/* Security shortcut */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Security</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success"><BadgeCheck className="size-4" /> Email verification enabled</span>
          <Link to="/account/security" className="inline-flex items-center gap-1.5 rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"><KeyRound className="size-4" /> Change password</Link>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-3xl border border-destructive/30 bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-destructive"><ShieldAlert className="size-5" /> Danger zone</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => toast("Account deactivation request noted. Our team will follow up.")} className="rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">Deactivate account</button>
          <button onClick={() => toast("Account deletion request noted. Our team will follow up.")} className="rounded-2xl border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10">Request account deletion</button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function Readonly({ value }: { value: string }) {
  return <div className="w-full rounded-2xl border border-border bg-surface/60 px-3 py-3 text-sm font-medium text-muted-foreground">{value || "—"}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
    </label>
  );
}
