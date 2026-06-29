import { createFileRoute } from "@tanstack/react-router";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || rec.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

export const Route = createFileRoute("/api/email/reward-claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "unknown";
        if (rateLimited(ip)) {
          return Response.json({ success: false, error: "Too many requests." }, { status: 429 });
        }

        let body: { email?: string; asset?: string; network?: string; amountUsd?: number };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }

        const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
        const asset = String(body.asset ?? "").slice(0, 12);
        const network = String(body.network ?? "").slice(0, 40);
        const amountUsd = Number(body.amountUsd) || 20;
        if (!EMAIL_RE.test(email) || !asset || !network) {
          return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
        }

        const { renderRewardEmail } = await import("@/server/email/emailTemplate");
        const { sendTransactionalEmail } = await import("@/server/email/emailService");
        const { subject, html, text } = renderRewardEmail({ amountUsd, asset, network });
        const sent = await sendTransactionalEmail({
          to: email,
          subject,
          html,
          text,
          purpose: "reward_claim",
          metadata: { asset, network, amountUsd },
        });
        if (!sent.ok) {
          return Response.json({ success: false, error: sent.error }, { status: 502 });
        }
        return Response.json({ success: true });
      },
    },
  },
});