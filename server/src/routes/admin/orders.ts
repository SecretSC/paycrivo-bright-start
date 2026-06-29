import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { shortenAddress } from "../../lib/safe.js";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { logAdminAction } from "../../lib/log.js";

export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAdmin);

adminOrdersRouter.get("/", async (req, res) => {
  const { type, status, q } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
    ];
  }
  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ orders: orders.map((o) => ({ ...o, walletAddress: shortenAddress(o.walletAddress) })) });
});

adminOrdersRouter.get("/:id", async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { OR: [{ id: req.params.id }, { reference: req.params.id }] },
    include: { events: { orderBy: { createdAt: "asc" } }, notes: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  const ticket = await prisma.supportTicket.findFirst({ where: { relatedOrderId: { in: [order.id, order.reference] } } });
  // Detail returns shortened address + full address only for copy action via separate flag.
  res.json({ order: { ...order, walletAddressShort: shortenAddress(order.walletAddress) }, ticket });
});

const statusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled", "manual_review"]),
  paymentStatus: z.string().max(40).optional(),
  note: z.string().max(2000).optional(),
});

adminOrdersRouter.patch("/:id/status", requireRole("order_manager"), validateBody(statusSchema), async (req, res) => {
  const { status, paymentStatus, note } = req.body as z.infer<typeof statusSchema>;
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status, paymentStatus,
      events: { create: { eventType: "status_changed", metadataJson: { status, by: req.admin!.sub } } },
      ...(note ? { notes: { create: { adminId: req.admin!.sub, note } } } : {}),
    },
  });
  await logAdminAction({ adminId: req.admin!.sub, action: "order_status", targetType: "order", targetId: order.id, metadata: { status } });
  res.json({ order: { ...order, walletAddress: shortenAddress(order.walletAddress) } });
});