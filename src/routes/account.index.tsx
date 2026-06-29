import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { FiatSelector } from "@/components/paycrivo/FiatSelector";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/account/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [fiat, setFiat] = useState(user?.preferredFiat ?? "USD");
  const [language, setLanguage] = useState(user?.language ?? "English");

  const save = () => {
    updateProfile({ firstName, lastName, country, phone, preferredFiat: fiat, language });
    toast.success("Profile updated");
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <h2 className="font-display text-lg font-bold text-foreground">Profile</h2>
      <div className="mt-5 space-y-4">
        <Field label="Email"><input disabled value={user?.email ?? ""} className={`${inp} opacity-70`} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inp} /></Field>
          <Field label="Last name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inp} /></Field>
        </div>
        <Field label="Country"><CountrySelector value={country} onChange={setCountry} /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preferred fiat"><FiatSelector value={fiat} onChange={setFiat} /></Field>
          <Field label="Language">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inp}>
              {["English", "Dansk", "Deutsch", "Español", "Français", "Italiano"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Theme">
          <button onClick={toggle} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
            {theme === "dark" ? "Dark mode" : "Light mode"} — switch
          </button>
        </Field>
        <button onClick={save} className="bg-gradient-primary rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft">Save changes</button>
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