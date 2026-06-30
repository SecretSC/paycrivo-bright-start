import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { shortenAddress } from "../lib/safe.js";
import { optionalCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const liveRouter = Router();

// Coarse server-side fallbacks so self-hosted deployments still get device /
// browser / country even if the client doesn't send them.
function parseDevice(ua: string): string {
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}
function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}
function countryFrom(req: { headers: Record<string, unknown> }): string | undefined {
  const h = req.headers;
  const c = (h["cf-ipcountry"] || h["x-vercel-ip-country"] || h["x-country"] || h["x-geo-country"]) as string | undefined;
  return c && c !== "XX" ? String(c) : undefined;
}

// Safe event types only. Anything else is rejected.
const SAFE_EVENTS = new Set([
  "page_view", "clicked_buy", "clicked_exchange", "amount_changed", "selected_asset",
  "selected_fiat", "reached_email_step", "email_verified", "reached_wallet_step",
  "wallet_submitted", "wallet_validation_failed", "ownership_confirmed", "ownership_manual",
  "order_created", "support_opened", "support_ticket_created", "checkout_abandoned", "error",
]);

const trackSchema = z.object({
  anonId: z.string().min(4).max(80),
  eventType: z.string().max(60),
  currentPage: z.string().max(200).optional(),
  flow: z.string().max(40).optional(),
  step: z.string().max(40).optional(),
  selectedAsset: z.string().max(20).optional(),
  selectedFiat: z.string().max(8).optional(),
  relatedOrderId: z.string().max(60).optional(),
  status: z.string().max(40).optional(),
  deviceType: z.string().max(20).optional(),
  browser: z.string().max(40).optional(),
  country: z.string().max(60).optional(),
  email: z.string().email().optional(),
  // wallet address accepted only to be shortened — full value never stored here.
  walletAddress: z.string().max(200).optional(),
});

liveRouter.post("/track", optionalCustomer, validateBody(trackSchema), async (req, res) => {
  const d = req.body as z.infer<typeof trackSchema>;
  if (!SAFE_EVENTS.has(d.eventType)) {
    return res.status(400).json({ error: "Unsupported event type" });
  }
  const ua = String(req.headers["user-agent"] ?? "");
  const deviceType = d.deviceType ?? parseDevice(ua);
  const browser = d.browser ?? parseBrowser(ua);
  const country = d.country ?? countryFrom(req);
  const session = await prisma.session.upsert({
    where: { anonId: d.anonId },
    create: {
      anonId: d.anonId, userId: req.customer?.sub ?? null, email: d.email?.toLowerCase(),
      currentPage: d.currentPage, flow: d.flow, step: d.step,
      selectedAsset: d.selectedAsset, selectedFiat: d.selectedFiat,
      relatedOrderId: d.relatedOrderId, status: d.status ?? "browsing",
      deviceType, browser, country,
    },
    update: {
      userId: req.customer?.sub ?? undefined, email: d.email?.toLowerCase() ?? undefined,
      currentPage: d.currentPage, flow: d.flow, step: d.step,
      selectedAsset: d.selectedAsset, selectedFiat: d.selectedFiat,
      relatedOrderId: d.relatedOrderId, status: d.status ?? undefined,
      deviceType, browser, country: country ?? undefined,
      lastActivityAt: new Date(),
    },
  });
  // Build safe metadata; shorten any wallet address, never store raw secrets.
  const metadata: Record<string, unknown> = {};
  if (d.selectedAsset) metadata.asset = d.selectedAsset;
  if (d.selectedFiat) metadata.fiat = d.selectedFiat;
  if (d.step) metadata.step = d.step;
  if (d.walletAddress) metadata.walletShort = shortenAddress(d.walletAddress);
  if (d.currentPage) metadata.page = d.currentPage;
  await prisma.liveEvent.create({
    data: {
      sessionId: session.id, userId: req.customer?.sub ?? null,
      eventType: d.eventType, metadataJson: metadata as object,
    },
  });
  res.json({ ok: true, sessionId: session.id });
});

// Customer polls for pending admin navigation suggestions (consent-based).
liveRouter.get("/suggestions/:anonId", async (req, res) => {
  const session = await prisma.session.findUnique({ where: { anonId: req.params.anonId } });
  if (!session) return res.json({ suggestion: null });
  const event = await prisma.liveEvent.findFirst({
    where: { sessionId: session.id, eventType: "nav_suggestion" },
    orderBy: { createdAt: "desc" },
  });
  res.json({ suggestion: event?.metadataJson ?? null });
});