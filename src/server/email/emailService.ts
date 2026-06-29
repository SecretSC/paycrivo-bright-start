// Server-only email verification code service. Never import from client code.
// Codes live in module memory (prototype). Sending uses the Mailjet HTTP API
// authenticated with the Mailjet SMTP credentials (SMTP_USER / SMTP_PASS).
import { renderOtpEmail, subjectFor, type EmailPurpose } from "./emailTemplate";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // temporary block after too many attempts

type CodeRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  blockedUntil: number;
};

const store = new Map<string, CodeRecord>();
const keyOf = (email: string, purpose: string) => `${email.trim().toLowerCase()}::${purpose}`;

export function createEmailCode(): string {
  // 4-digit numeric code, 0000–9999.
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

export function expireEmailCode(email: string, purpose: EmailPurpose): void {
  store.delete(keyOf(email, purpose));
}

export function storeEmailCode(email: string, purpose: EmailPurpose, code: string): CodeRecord {
  const now = Date.now();
  const prev = store.get(keyOf(email, purpose));
  const rec: CodeRecord = {
    code,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    blockedUntil: prev?.blockedUntil ?? 0,
  };
  store.set(keyOf(email, purpose), rec); // new code invalidates the old one
  return rec;
}

export type SendResult =
  | { ok: true }
  | { ok: false; error: string; cooldownRemaining?: number; blocked?: boolean };

export async function sendEmailCode(email: string, purpose: EmailPurpose): Promise<SendResult> {
  const now = Date.now();
  const existing = store.get(keyOf(email, purpose));

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return { ok: false, error: "Too many attempts. Please try again later.", blocked: true };
  }
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const cooldownRemaining = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return { ok: false, error: `Please wait before requesting a new code.`, cooldownRemaining };
  }

  const code = createEmailCode();
  storeEmailCode(email, purpose, code);

  const sent = await deliverEmail(email, purpose, code);
  if (!sent.ok) {
    return { ok: false, error: sent.error };
  }
  return { ok: true };
}

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      remainingAttempts?: number;
      expired?: boolean;
      blocked?: boolean;
    };

export function verifyEmailCode(email: string, code: string, purpose: EmailPurpose): VerifyResult {
  const now = Date.now();
  const rec = store.get(keyOf(email, purpose));
  if (!rec) return { ok: false, error: "No active code. Request a new one." };
  if (rec.blockedUntil && rec.blockedUntil > now) {
    return { ok: false, error: "Too many attempts. Please try again later.", blocked: true };
  }
  if (rec.expiresAt < now) {
    store.delete(keyOf(email, purpose));
    return { ok: false, error: "This code has expired. Request a new one.", expired: true };
  }
  if (rec.code !== code.trim()) {
    rec.attempts += 1;
    if (rec.attempts >= MAX_ATTEMPTS) {
      rec.blockedUntil = now + BLOCK_MS;
      store.set(keyOf(email, purpose), rec);
      return { ok: false, error: "Too many incorrect attempts. Please try again later.", blocked: true };
    }
    store.set(keyOf(email, purpose), rec);
    return {
      ok: false,
      error: "That code is incorrect.",
      remainingAttempts: MAX_ATTEMPTS - rec.attempts,
    };
  }
  store.delete(keyOf(email, purpose)); // single-use
  return { ok: true };
}

// Returns the current code for the dev helper only (gated by route + env).
export function peekEmailCode(email: string, purpose: EmailPurpose): string | null {
  const rec = store.get(keyOf(email, purpose));
  if (!rec || rec.expiresAt < Date.now()) return null;
  return rec.code;
}

async function deliverEmail(
  email: string,
  purpose: EmailPurpose,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM_EMAIL || "noreply@panema.it";
  const fromName = process.env.SMTP_FROM_NAME || "PayCrivo";

  if (!user || !pass) {
    return { ok: false, error: "Email service is not configured." };
  }

  const { html, text } = renderOtpEmail(purpose, code);
  const subject = subjectFor(purpose);
  const auth = btoa(`${user}:${pass}`);

  try {
    const res = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: fromEmail, Name: fromName },
            To: [{ Email: email }],
            Subject: subject,
            HTMLPart: html,
            TextPart: text,
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Mailjet send failed", res.status, body.slice(0, 300));
      return { ok: false, error: "We couldn't send the email right now. Please try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Mailjet send error", err);
    return { ok: false, error: "We couldn't send the email right now. Please try again." };
  }
}