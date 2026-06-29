import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { OtpVerify } from "@/components/auth/OtpVerify";
import { sendCode } from "@/lib/email-otp";
import { useAuth } from "@/lib/auth";
import { isPasswordValid, PASSWORD_ERROR } from "@/lib/password";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset your PayCrivo password" }] }),
  component: ForgotPasswordPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [stage, setStage] = useState<"email" | "otp" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sending, setSending] = useState(false);

  const startReset = async () => {
    setError(null);
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    // Always send to avoid revealing whether the account exists.
    await sendCode(email.trim().toLowerCase(), "forgot_password");
    setSending(false);
    setStage("otp");
  };

  const applyNewPassword = () => {
    setError(null);
    if (!isPasswordValid(pw)) {
      setError(PASSWORD_ERROR);
      return;
    }
    if (pw !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    resetPassword(email.trim().toLowerCase(), pw); // generic — never reveals account existence
    setStage("done");
  };

  return (
    <PageChrome promo={false}>
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          {stage === "email" && (
            <>
              <h1 className="font-display text-xl font-bold text-foreground">Reset your password</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Enter your email and we'll send a 4-digit code.</p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                className="mt-5 w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              <button onClick={startReset} disabled={sending}
                className="bg-gradient-primary mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:opacity-60">
                Send reset code <ArrowRight className="size-4" />
              </button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
              </p>
            </>
          )}
          {stage === "otp" && (
            <OtpVerify
              email={email.trim().toLowerCase()}
              purpose="forgot_password"
              autoSend={false}
              title="Enter your reset code"
              onVerified={() => setStage("reset")}
            />
          )}
          {stage === "reset" && (
            <>
              <h1 className="font-display text-xl font-bold text-foreground">Set a new password</h1>
              <div className="mt-5 space-y-4">
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password"
                  className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
                <PasswordChecklist value={pw} />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password"
                  className="w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button onClick={applyNewPassword}
                  className="bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft">
                  Update password
                </button>
              </div>
            </>
          )}
          {stage === "done" && (
            <div className="text-center">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
                <CheckCircle2 className="size-7" />
              </span>
              <h1 className="font-display text-xl font-bold text-foreground">Password updated</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">You can now sign in with your new password.</p>
              <button onClick={() => navigate({ to: "/login" })}
                className="bg-gradient-primary mt-5 w-full rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft">
                Go to sign in
              </button>
            </div>
          )}
        </div>
      </main>
    </PageChrome>
  );
}