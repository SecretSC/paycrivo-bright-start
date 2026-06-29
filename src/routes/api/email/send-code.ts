import { createFileRoute } from "@tanstack/react-router";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURPOSES = ["signup", "buy_checkout", "exchange_checkout", "forgot_password", "login_security"];

// Lightweight per-IP rate limiting for the send endpoint (prototype, in-memory).
const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string, max = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || rec.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

export const Route = createFileRoute("/api/email/send-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "unknown";
        if (rateLimited(ip)) {
          return Response.json(
            { success: false, error: "Too many requests. Please slow down." },
            { status: 429 },
          );
        }

        let body: { email?: string; purpose?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }

        const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
        const purpose = String(body.purpose ?? "");
        if (!EMAIL_RE.test(email)) {
          return Response.json({ success: false, error: "Enter a valid email address." }, { status: 400 });
        }
        if (!PURPOSES.includes(purpose)) {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }

        const { sendEmailCode, peekEmailCode } = await import("@/server/email/emailService");
        const result = await sendEmailCode(email, purpose as never);

        if (!result.ok) {
          return Response.json(
            { success: false, error: result.error, cooldownRemaining: result.cooldownRemaining, blocked: result.blocked },
            { status: result.blocked ? 429 : 400 },
          );
        }

        const showDev = process.env.VITE_SHOW_DEV_CODES === "true";
        return Response.json({
          success: true,
          cooldown: 60,
          ...(showDev ? { devCode: peekEmailCode(email, purpose as never) } : {}),
        });
      },
    },
  },
});