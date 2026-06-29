import { createFileRoute } from "@tanstack/react-router";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PURPOSES = ["signup", "buy_checkout", "exchange_checkout", "forgot_password", "login_security"];

const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || rec.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

export const Route = createFileRoute("/api/email/verify-code")({
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

        let body: { email?: string; purpose?: string; code?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }

        const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
        const purpose = String(body.purpose ?? "");
        const code = String(body.code ?? "").replace(/\D/g, "").slice(0, 4);
        if (!EMAIL_RE.test(email) || !PURPOSES.includes(purpose)) {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }
        if (code.length !== 4) {
          return Response.json({ success: false, error: "Enter the 4-digit code." }, { status: 400 });
        }

        const { verifyEmailCode } = await import("@/server/email/emailService");
        const result = verifyEmailCode(email, code, purpose as never);
        if (!result.ok) {
          return Response.json(
            {
              success: false,
              error: result.error,
              remainingAttempts: result.remainingAttempts,
              expired: result.expired,
              blocked: result.blocked,
            },
            { status: result.blocked ? 429 : 400 },
          );
        }
        return Response.json({ success: true });
      },
    },
  },
});