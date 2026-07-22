// Static-hosting OTP flow.
//
// The frontend is deployed to a static host with no server runtime in reach —
// neither the Node backend nor PHP is available. We generate the OTP code in
// the browser and deliver it via EmailJS (https://www.emailjs.com/), which
// exposes a CORS-friendly REST endpoint that accepts SMTP-backed sends from
// the browser. Verification stays fully client-side against the code we just
// stored. Configure EmailJS credentials via env
// (VITE_EMAILJS_SERVICE_ID / VITE_EMAILJS_TEMPLATE_ID / VITE_EMAILJS_PUBLIC_KEY)
// or the admin SMTP manager (localStorage keys mirror the same names).
import type { OtpPurpose, SendCodeResponse, VerifyCodeResponse } from "@/lib/email-otp";

const isDev = import.meta.env.DEV;
function devLog(...args: unknown[]) {
  if (isDev) console.info("[OTP]", ...args);
}

const STORE_KEY = "paycrivo_otp_store";
const COOLDOWN_SECONDS = 60;
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { code: string; createdAt: number; lastSentAt: number; attempts: number };

function readStore(): Record<string, Entry> {
  try { return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}
function writeStore(all: Record<string, Entry>) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}
function keyFor(email: string, purpose: OtpPurpose) {
  return `${email.toLowerCase()}::${purpose}`;
}

const PURPOSE_LABEL: Record<OtpPurpose, string> = {
  signup: "Confirm your PayCrivo account",
  buy_checkout: "Verify your email to complete your purchase",
  exchange_checkout: "Verify your email to complete your exchange",
  forgot_password: "Reset your PayCrivo password",
  login_security: "Confirm your PayCrivo sign-in",
};

function buildEmail(code: string, purpose: OtpPurpose): { subject: string; html: string; text: string } {
  const title = PURPOSE_LABEL[purpose];
  const subject = `${title} — code ${code}`;
  const html = `<!doctype html><html><body style="margin:0;background:#0b0724;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e9e5ff;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#141033;border:1px solid #2a2358;border-radius:20px;padding:32px;">
    <div style="font-size:20px;font-weight:700;color:#a78bff;margin-bottom:8px;">PayCrivo</div>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#c7c0eb;margin:0 0 24px;">Use the verification code below. It expires in 10 minutes.</p>
    <div style="font-size:34px;font-weight:800;letter-spacing:10px;text-align:center;background:#1e1747;border-radius:14px;padding:20px 0;color:#fff;">${code}</div>
    <p style="font-size:12px;color:#8b83b8;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
  </div></body></html>`;
  const text = `${title}\n\nYour PayCrivo verification code is: ${code}\nIt expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`;
  return { subject, html, text };
}

function readEmailJsConfig(): { serviceId: string; templateId: string; publicKey: string } {
  const envSvc = (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? "";
  const envTpl = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? "";
  const envKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? "";
  let lsSvc = "", lsTpl = "", lsKey = "";
  try {
    lsSvc = localStorage.getItem("paycrivo_emailjs_service_id") ?? "";
    lsTpl = localStorage.getItem("paycrivo_emailjs_template_id") ?? "";
    lsKey = localStorage.getItem("paycrivo_emailjs_public_key") ?? "";
  } catch { /* ignore */ }
  return {
    serviceId: (lsSvc || envSvc).trim(),
    templateId: (lsTpl || envTpl).trim(),
    publicKey: (lsKey || envKey).trim(),
  };
}

async function sendViaEmailJs(to: string, subject: string, html: string, text: string): Promise<void> {
  const { serviceId, templateId, publicKey } = readEmailJsConfig();
  if (!serviceId || !templateId || !publicKey) {
    throw new Error("EmailJS is not configured. Set service/template/public key in Admin → SMTP Manager.");
  }
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: to,
        to: to,
        subject,
        message: text,
        message_html: html,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `EmailJS send failed (${res.status})`);
  }
}

export async function sendOtp(email: string, purpose: OtpPurpose): Promise<SendCodeResponse> {
  const k = keyFor(email, purpose);
  const now = Date.now();
  const store = readStore();
  const prev = store[k];
  if (prev && now - prev.lastSentAt < COOLDOWN_SECONDS * 1000) {
    return {
      success: false,
      cooldownRemaining: Math.ceil((COOLDOWN_SECONDS * 1000 - (now - prev.lastSentAt)) / 1000),
      error: "Please wait before requesting a new code.",
    };
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  const { subject, html, text } = buildEmail(code, purpose);

  try {
    await sendViaEmailJs(email, subject, html, text);
    store[k] = { code, createdAt: now, lastSentAt: now, attempts: 0 };
    writeStore(store);
    devLog("send status: EmailJS relayed");
    return { success: true, cooldown: COOLDOWN_SECONDS };
  } catch (e) {
    devLog("send status: EmailJS failed", e);
    // Fallback so preview / mis-configured SMTP still lets QA proceed: store
    // the code and surface it as devCode so the UI can display it.
    store[k] = { code, createdAt: now, lastSentAt: now, attempts: 0 };
    writeStore(store);
    const msg = e instanceof Error ? e.message : "Mail send failed";
    // In dev we still return success + devCode so the flow is testable.
    if (isDev) return { success: true, cooldown: COOLDOWN_SECONDS, devCode: code };
    return { success: false, error: `We couldn't send the email: ${msg}` };
  }
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<VerifyCodeResponse> {
  const k = keyFor(email, purpose);
  const store = readStore();
  const entry = store[k];
  if (!entry) return { success: false, error: "No active code. Request a new one." };
  if (Date.now() - entry.createdAt > TTL_MS) {
    delete store[k]; writeStore(store);
    return { success: false, expired: true, error: "Code expired. Request a new one." };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    delete store[k]; writeStore(store);
    return { success: false, blocked: true, error: "Too many attempts. Request a new code." };
  }
  if (entry.code !== code) {
    entry.attempts += 1;
    store[k] = entry; writeStore(store);
    return {
      success: false,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - entry.attempts),
      error: "Incorrect code.",
    };
  }
  delete store[k]; writeStore(store);
  return { success: true };
}
