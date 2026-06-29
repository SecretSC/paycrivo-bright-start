import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in to PayCrivo" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const res = login(email, password);
    if (res.ok) {
      navigate({ to: "/dashboard" });
      return;
    }
    if (res.needsVerify) {
      navigate({ to: "/verify-email", search: { email: email.trim().toLowerCase(), purpose: "signup" } });
      return;
    }
    setError(res.error ?? "Could not sign in.");
  };

  return (
    <PageChrome>
      <main className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
        <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your PayCrivo account.</p>

        <div className="mt-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-primary" />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password?</Link>
          </div>
          <button onClick={submit} className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
            Sign in <ArrowRight className="size-4" />
          </button>
          <p className="text-center text-sm text-muted-foreground">
            New to PayCrivo?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
    </PageChrome>
  );
}