import nodemailer from "nodemailer";
import { env } from "./env.js";
import { getSmtpSettings, patchSmtpSettings } from "./runtimeSettings.js";
import { decryptSecret } from "./secretsCrypto.js";

// -------------------------- effective SMTP config --------------------------
// DB-managed SMTP (Admin → Settings → SMTP) takes priority when enabled and a
// host is set; otherwise we fall back to the .env SMTP so currently-working
// delivery is never broken. The password falls back to env when the DB one is
// empty (e.g. admin edited host/user but didn't re-enter the password).
export type EffectiveSmtp = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  source: "db" | "env" | "none";
};

export async function resolveSmtp(): Promise<EffectiveSmtp> {
  const db = await getSmtpSettings();
  if (db.enabled && db.host) {
    return {
      host: db.host,
      port: db.port || 587,
      user: db.user || env.smtp.user,
      pass: db.passEnc ? decryptSecret(db.passEnc) : env.smtp.pass,
      fromEmail: db.fromEmail || env.smtp.fromEmail,
      fromName: db.fromName || env.smtp.fromName,
      source: "db",
    };
  }
  if (env.smtp.host) {
    return { ...env.smtp, source: "env" };
  }
  return { host: "", port: 587, user: "", pass: "", fromEmail: env.smtp.fromEmail, fromName: env.smtp.fromName, source: "none" };
}

// Cache the transporter keyed by a hash of the effective config so admin edits
// take effect without a restart.
let cached: { key: string; t: nodemailer.Transporter } | null = null;

function transporterFor(cfg: EffectiveSmtp): nodemailer.Transporter | null {
  if (!cfg.host) return null;
  const key = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.pass ? "1" : "0"}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      t: nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.port === 465,
        auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      }),
    };
  }
  return cached.t;
}

export async function smtpConfigured(): Promise<boolean> {
  return Boolean((await resolveSmtp()).host);
}

async function recordSuccess() {
  try { await patchSmtpSettings({ lastSuccessAt: new Date().toISOString(), lastError: null }); } catch { /* ignore */ }
}
async function recordError(message: string) {
  try { await patchSmtpSettings({ lastErrorAt: new Date().toISOString(), lastError: message.slice(0, 300) }); } catch { /* ignore */ }
}

/** Send an arbitrary email through the effective SMTP. Throws on failure. */
export async function sendRawEmail(to: string, subject: string, html: string, text?: string) {
  const cfg = await resolveSmtp();
  const t = transporterFor(cfg);
  if (!t) throw new Error("SMTP is not configured.");
  try {
    await t.sendMail({ from: `${cfg.fromName} <${cfg.fromEmail}>`, to, subject, html, text: text ?? subject });
    await recordSuccess();
  } catch (e) {
    await recordError(e instanceof Error ? e.message : "Unknown SMTP error");
    throw e;
  }
}

const SUBJECTS: Record<string, string> = {
  signup: "Your PayCrivo verification code",
  buy_checkout: "Confirm your PayCrivo purchase",
  exchange_checkout: "Confirm your PayCrivo exchange",
  forgot_password: "Reset your PayCrivo password",
  login_security: "PayCrivo security code",
};

export function otpEmailHtml(subject: string, code: string): string {
  return `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;background:#120a24;color:#fff;border-radius:16px;padding:32px">
      <h1 style="font-size:20px;margin:0 0 8px">PayCrivo</h1>
      <p style="color:#cbb9f0;margin:0 0 24px">${subject}</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;background:#2b1259;border-radius:12px;padding:18px;text-align:center">${code}</div>
      <p style="color:#9b8ac4;font-size:13px;margin-top:24px">This code expires in ${env.otp.ttlMinutes} minutes. If you didn't request it, ignore this email. Never share this code or your wallet secrets with anyone.</p>
    </div>`;
}

export async function sendOtpEmail(to: string, purpose: string, code: string) {
  const cfg = await resolveSmtp();
  const t = transporterFor(cfg);
  const subject = SUBJECTS[purpose] ?? "Your PayCrivo code";
  const html = otpEmailHtml(subject, code);
  if (!t) {
    // Dev fallback: log so flows work without SMTP configured.
    console.log(`[email:dev] OTP for ${to} (${purpose}): ${code}`);
    return { delivered: false, devCode: code };
  }
  try {
    await t.sendMail({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to,
      subject,
      html,
      text: `Your PayCrivo code is ${code}. It expires in ${env.otp.ttlMinutes} minutes.`,
    });
    await recordSuccess();
    return { delivered: true };
  } catch (e) {
    await recordError(e instanceof Error ? e.message : "Unknown SMTP error");
    throw e;
  }
}