import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { sendCode, verifyCode, type OtpPurpose } from "@/lib/email-otp";

export function OtpVerify({
  email,
  purpose,
  onVerified,
  autoSend = true,
  title = "Verify your email",
  subtitle,
}: {
  email: string;
  purpose: OtpPurpose;
  onVerified: () => void;
  autoSend?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  const triggerSend = async (manual: boolean) => {
    setSending(true);
    setError(null);
    setInfo(null);
    const res = await sendCode(email, purpose);
    setSending(false);
    if (!res.success) {
      if (res.cooldownRemaining) setCooldown(res.cooldownRemaining);
      setError(res.error ?? "Could not send code.");
      return;
    }
    setCooldown(res.cooldown ?? 60);
    setDevCode(res.devCode ?? null);
    if (manual) setInfo("A new code is on its way.");
    else setInfo(`We sent a 4-digit code to ${email}.`);
  };

  useEffect(() => {
    if (autoSend && !sentRef.current) {
      sentRef.current = true;
      void triggerSend(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = async () => {
    if (code.length !== 4 || verifying) return;
    setVerifying(true);
    setError(null);
    const res = await verifyCode(email, purpose, code);
    setVerifying(false);
    if (res.success) {
      onVerified();
      return;
    }
    setCode("");
    if (res.expired) setError("This code expired. Request a new one.");
    else if (typeof res.remainingAttempts === "number")
      setError(`${res.error} ${res.remainingAttempts} attempt${res.remainingAttempts === 1 ? "" : "s"} left.`);
    else setError(res.error ?? "Verification failed.");
  };

  return (
    <div className="text-center">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <MailCheck className="size-6" />
      </span>
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {subtitle ?? (
          <>We sent a 4-digit code to <span className="font-semibold text-foreground">{email}</span></>
        )}
      </p>

      <div className="mx-auto mt-6 flex max-w-[260px] justify-center gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            inputMode="numeric"
            maxLength={1}
            value={code[i] ?? ""}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(-1);
              const next = (code.substring(0, i) + d + code.substring(i + 1)).slice(0, 4);
              setCode(next);
              if (d && i < 3) {
                const el = document.getElementById(`otp-${i + 1}`);
                el?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !code[i] && i > 0) {
                document.getElementById(`otp-${i - 1}`)?.focus();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
              if (pasted) {
                e.preventDefault();
                setCode(pasted);
              }
            }}
            id={`otp-${i}`}
            className="size-14 rounded-2xl border border-border bg-surface text-center text-2xl font-bold text-foreground outline-none transition-colors focus:border-primary"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {devCode && import.meta.env.VITE_SHOW_DEV_CODES === "true" && (
        <p className="mt-3 text-xs text-muted-foreground">Dev code: <span className="font-mono font-bold">{devCode}</span></p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
      {!error && info && <p className="mt-3 text-sm text-muted-foreground">{info}</p>}

      <button
        onClick={submit}
        disabled={code.length !== 4 || verifying}
        className="bg-gradient-primary mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {verifying ? <Loader2 className="size-4 animate-spin" /> : null} Verify
      </button>

      <button
        onClick={() => triggerSend(true)}
        disabled={cooldown > 0 || sending}
        className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
      >
        <RefreshCw className={`size-3.5 ${sending ? "animate-spin" : ""}`} />
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>

      <p className="mt-4 text-xs text-muted-foreground">
        Didn't receive it? Check your spam or junk folder, then try resend.
      </p>
    </div>
  );
}