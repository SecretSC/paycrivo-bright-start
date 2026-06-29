import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { shortenAddress } from "../../lib/safe.js";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { logAdminAction } from "../../lib/log.js";

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAdmin);

// Never returns passwordHash.
function safeUser(u: any) {
  return {
    id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
    country: u.country, phone: u.phone, emailVerified: u.emailVerified,
    status: u.status, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
  };
}

adminUsersRouter.get("/", async (req, res) => {
  const { q } = req.query as Record<string, string | undefined>;
  const where = q
    ? { OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { firstName: { contains: q, mode: "insensitive" as const } },
        { lastName: { contains: q, mode: "insensitive" as const } },
      ] }
    : {};
  const users = await prisma.user.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    include: { _count: { select: { orders: true } }, rewardClaims: { take: 1 } },
  });
  res.json({
    users: users.map((u) => ({ ...safeUser(u), totalOrders: u._count.orders, rewardStatus: u.rewardClaims[0]?.status ?? "available" })),
  });
});

adminUsersRouter.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 50 },
      wallets: true,
      rewardClaims: true,
      supportTickets: { orderBy: { createdAt: "desc" }, take: 20 },
      internalNotes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    user: safeUser(user),
    orders: user.orders.map((o) => ({ ...o, walletAddress: shortenAddress(o.walletAddress) })),
    wallets: user.wallets.map((w) => ({ ...w, address: shortenAddress(w.address) })),
    rewardClaims: user.rewardClaims.map((r) => ({ ...r, walletAddress: shortenAddress(r.walletAddress) })),
    tickets: user.supportTickets,
    notes: user.internalNotes,
  });
});

const actionSchema = z.object({ action: z.enum(["suspend", "reactivate", "resend_verification", "mark_support_needed"]) });

adminUsersRouter.post("/:id/actions", requireRole("order_manager", "support_agent"), validateBody(actionSchema), async (req, res) => {
  const { action } = req.body as z.infer<typeof actionSchema>;
  if (action === "suspend") await prisma.user.update({ where: { id: req.params.id }, data: { status: "suspended" } });
  if (action === "reactivate") await prisma.user.update({ where: { id: req.params.id }, data: { status: "active" } });
  await logAdminAction({ adminId: req.admin!.sub, action: `user_${action}`, targetType: "user", targetId: req.params.id });
  res.json({ ok: true });
});

adminUsersRouter.post("/:id/notes", async (req, res) => {
  const note = String(req.body?.note ?? "").slice(0, 2000);
  if (!note) return res.status(400).json({ error: "Note required" });
  const created = await prisma.userNote.create({ data: { userId: req.params.id, adminId: req.admin!.sub, note } });
  await logAdminAction({ adminId: req.admin!.sub, action: "user_note", targetType: "user", targetId: req.params.id });
  res.status(201).json({ note: created });
});