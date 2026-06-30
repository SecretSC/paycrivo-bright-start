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

  // Bulk-load related users, orders and the latest event per session so the
  // Live Ops cards can show personal details, amount/asset/network and last
  // action without N+1 queries.
  const userIds = [...new Set(sessions.map((s) => s.userId).filter(Boolean))] as string[];
  const emails = [...new Set(sessions.map((s) => s.email?.toLowerCase()).filter(Boolean))] as string[];
  const orderRefs = [...new Set(sessions.map((s) => s.relatedOrderId).filter(Boolean))] as string[];
  const sessionIds = sessions.map((s) => s.id);

  const [users, orders, latestEvents] = await Promise.all([
    userIds.length || emails.length
      ? prisma.user.findMany({ where: { OR: [{ id: { in: userIds } }, { email: { in: emails } }] } })
      : Promise.resolve([]),
    orderRefs.length
      ? prisma.order.findMany({ where: { OR: [{ id: { in: orderRefs } }, { reference: { in: orderRefs } }] } })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.liveEvent.findMany({
          where: { sessionId: { in: sessionIds }, eventType: { not: "nav_suggestion" } },
          orderBy: { createdAt: "desc" },
          take: 400,
        })
      : Promise.resolve([]),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const orderByKey = new Map<string, (typeof orders)[number]>();
  orders.forEach((o) => { orderByKey.set(o.id, o); orderByKey.set(o.reference, o); });
  const lastEventBySession = new Map<string, (typeof latestEvents)[number]>();
  for (const ev of latestEvents) {
    if (ev.sessionId && !lastEventBySession.has(ev.sessionId)) lastEventBySession.set(ev.sessionId, ev);
  }

  const enriched = sessions.map((s) => {
    const user = (s.userId && userById.get(s.userId)) || (s.email && userByEmail.get(s.email.toLowerCase())) || null;
    const order = s.relatedOrderId ? orderByKey.get(s.relatedOrderId) ?? null : null;
    const lastEvent = lastEventBySession.get(s.id) ?? null;
    return {
      ...s,
      personal: user
        ? {
            firstName: user.firstName,
            lastName: user.lastName,
            country: user.country ?? s.country,
            phone: user.phone,
            emailVerified: user.emailVerified,
          }
        : null,
      order: order
        ? {
            reference: order.reference,
            type: order.type,
            status: order.status,
            asset: order.coin ?? order.receiveCoin ?? null,
            network: order.sendCoin ?? null,
            amount: order.spendAmount ?? order.sendAmount ?? null,
            fiat: order.fiat ?? null,
            walletAddress: shortenAddress(order.walletAddress),
          }
        : null,
      lastEvent: lastEvent ? { type: lastEvent.eventType, at: lastEvent.createdAt, meta: lastEvent.metadataJson } : null,
    };
  });

  res.json({ sessions: enriched });
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