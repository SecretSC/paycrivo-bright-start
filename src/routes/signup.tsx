import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { CountrySelector } from "@/components/checkout/CountrySelector";
import { countries } from "@/data/countries";
import { useAuth } from "@/lib/auth";
import { isPasswordValid, PASSWORD_ERROR } from "@/lib/password";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { Logo } from "@/components/paycrivo/Logo";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your PayCrivo account" },
      { name: "description", content: "Sign up for PayCrivo to buy and exchange crypto with transparent fees." },
    ],
  }),
  component: SignupPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignupPage() {
  const navigate = useNavigate();
  const { registerAccount } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm: "",
    firstName: "",
    lastName: "",
    country: "",
    phone: "",
    terms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);

  const dial = useMemo(() => countries.find((c) => c.name === form.country)?.dial ?? "", [form.country]);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address.";
    if (!isPasswordValid(form.password)) e.password = PASSWORD_ERROR;
    if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.country) e.country = "Select your country.";
    if (!/\d{5,}/.test(form.phone.replace(/\D/g, ""))) e.phone = "Enter a valid phone number.";
    if (!form.terms) e.terms = "You must accept the terms.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    const res = registerAccount({
      email: form.email,
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      country: form.country,
      phone: `${dial} ${form.phone}`.trim(),
    });
    if (!res.ok) {
      setErrors({ email: res.error ?? "Could not create account." });
      return;
    }
    navigate({ to: "/verify-email", search: { email: form.email.trim().toLowerCase(), purpose: "signup" } });
  };

  return (
    <PageChrome>
      <main className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
        <Logo asLink imgClassName="h-9 w-auto max-w-[170px] mb-6" />
        <h1 className="font-display text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Join PayCrivo to buy and exchange crypto.</p>

        <div className="mt-7 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" error={errors.firstName}>
              <input className={inp(errors.firstName)} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input className={inp(errors.lastName)} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
          </div>
          <Field label="Email address" error={errors.email}>
            <input type="email" className={inp(errors.email)} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
          </Field>
          <Field label="Password" error={errors.password}>
            <div className="relative">
              <input type={showPw ? "text" : "password"} className={inp(errors.password)} value={form.password} onChange={(e) => set("password", e.target.value)} />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordChecklist value={form.password} />
          </Field>
          <Field label="Confirm password" error={errors.confirm}>
            <input type={showPw ? "text" : "password"} className={inp(errors.confirm)} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </Field>
          <Field label="Country" error={errors.country}>
            <CountrySelector value={form.country} onChange={(name) => set("country", name)} error={!!errors.country} />
          </Field>
          <Field label="Phone number" error={errors.phone}>
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-3 focus-within:border-primary">
              <span className="text-sm font-semibold text-muted-foreground">{dial || "+--"}</span>
              <input className="w-full bg-transparent py-3 text-sm text-foreground outline-none" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" />
            </div>
          </Field>
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input type="checkbox" checked={form.terms} onChange={(e) => set("terms", e.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span>I agree to the PayCrivo Terms of Service and Privacy Policy.</span>
          </label>
          {errors.terms && <p className="-mt-2 text-sm text-destructive">{errors.terms}</p>}

          <button onClick={submit} className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
            Create account <ArrowRight className="size-4" />
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </PageChrome>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function inp(error?: string) {
  return `w-full rounded-2xl border bg-surface px-3 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary ${error ? "border-destructive" : "border-border"}`;
}