import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { shortenAddress } from "../../lib/safe.js";
import { requireAdmin } from "../../middleware/auth.js";

export const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAdmin);

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

adminDashboardRouter.get("/stats", async (_req, res) => {
  const today = startOfToday();
  const activeSince = new Date(Date.now() - 5 * 60_000);
  const [
    activeSessions, openTickets, pendingTickets, totalCustomers, usersToday,
    buyToday, exchangeToday, pendingOrders, rewardsPending, failedOrders, totalWallets,
  ] = await Promise.all([
    prisma.session.count({ where: { lastActivityAt: { gte: activeSince } } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.supportTicket.count({ where: { status: "pending" } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { type: "buy", createdAt: { gte: today } } }),
    prisma.order.count({ where: { type: "exchange", createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.rewardClaim.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "failed" } }),
    prisma.wallet.count(),
  ]);

  // Conversion funnel from live events.
  const funnelEvents = [
    "page_view", "support_opened", "reached_email_step", "email_verified",
    "reached_wallet_step", "ownership_confirmed", "order_created",
  ];
  const funnelCounts = await Promise.all(
    funnelEvents.map((e) => prisma.liveEvent.count({ where: { eventType: e } })),
  );
  const funnel = funnelEvents.map((e, i) => ({ stage: e, count: funnelCounts[i] }));

  res.json({
    cards: {
      activeSessions, openTickets, pendingTickets, totalCustomers, usersToday,
      buyToday, exchangeToday, pendingOrders, rewardsPending, failedOrders, totalWallets,
    },
    funnel,
  });
});

adminDashboardRouter.get("/overview", async (_req, res) => {
  const [recentOrders, recentTickets, recentUsers, recentActions] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.supportTicket.findMany({ orderBy: { lastMessageAt: "desc" }, take: 8 }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.adminActionLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  res.json({
    recentOrders: recentOrders.map((o) => ({ ...o, walletAddress: shortenAddress(o.walletAddress) })),
    recentTickets,
    recentUsers: recentUsers.map((u) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, createdAt: u.createdAt })),
    recentActions,
  });
});

adminDashboardRouter.get("/live-sessions", async (_req, res) => {
  const activeSince = new Date(Date.now() - 15 * 60_000);
  const sessions = await prisma.session.findMany({
    where: { lastActivityAt: { gte: activeSince } },
    orderBy: { lastActivityAt: "desc" },
    take: 100,
  });
  res.json({ sessions });
});

adminDashboardRouter.get("/live-sessions/:id", async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: { events: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!session) return res.status(404).json({ error: "Session not found" });
  const ticket = session.email
    ? await prisma.supportTicket.findFirst({ where: { OR: [{ sessionId: session.id }, { email: session.email }] }, orderBy: { createdAt: "desc" } })
    : await prisma.supportTicket.findFirst({ where: { sessionId: session.id }, orderBy: { createdAt: "desc" } });
  const order = session.relatedOrderId
    ? await prisma.order.findFirst({ where: { OR: [{ id: session.relatedOrderId }, { reference: session.relatedOrderId }] } })
    : null;
  res.json({
    session,
    ticket,
    order: order ? { ...order, walletAddress: shortenAddress(order.walletAddress) } : null,
  });
});

// Admin sends a navigation suggestion — customer must accept (consent-based).
adminDashboardRouter.post("/live-sessions/:id/suggest", async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });
  const to = String(req.body?.to ?? "");
  const label = String(req.body?.label ?? "PayCrivo Support suggests continuing.");
  await prisma.liveEvent.create({
    data: { sessionId: session.id, eventType: "nav_suggestion", metadataJson: { to, label, ts: Date.now() } },
  });
  res.json({ ok: true });
});