import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { logAdminAction } from "../../lib/log.js";

export const adminSupportRouter = Router();
adminSupportRouter.use(requireAdmin);

adminSupportRouter.get("/tickets", async (req, res) => {
  const { status, topic, q } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (topic) where.topic = topic;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { ticketNumber: { contains: q, mode: "insensitive" } },
      { relatedOrderId: { contains: q, mode: "insensitive" } },
    ];
  }
  const tickets = await prisma.supportTicket.findMany({
    where, orderBy: { lastMessageAt: "desc" }, take: 200,
  });
  res.json({ tickets });
});

adminSupportRouter.get("/tickets/:id", async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const order = ticket.relatedOrderId
    ? await prisma.order.findFirst({ where: { OR: [{ id: ticket.relatedOrderId }, { reference: ticket.relatedOrderId }] } })
    : null;
  res.json({ ticket, order });
});

const replySchema = z.object({ message: z.string().min(1).max(4000) });

adminSupportRouter.post("/tickets/:id/messages", requireRole("support_agent", "order_manager"), validateBody(replySchema), async (req, res) => {
  const { message } = req.body as z.infer<typeof replySchema>;
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const created = await prisma.supportMessage.create({
    data: { ticketId: ticket.id, senderType: "admin", senderId: req.admin!.sub, message },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id }, data: { lastMessageAt: new Date(), status: "pending" },
  });
  await logAdminAction({ adminId: req.admin!.sub, action: "support_reply", targetType: "ticket", targetId: ticket.id });
  res.status(201).json({ message: created });
});

const patchSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["normal", "high", "urgent"]).optional(),
  assignedAdminId: z.string().optional(),
});

adminSupportRouter.patch("/tickets/:id", requireRole("support_agent", "order_manager"), validateBody(patchSchema), async (req, res) => {
  const data = req.body as z.infer<typeof patchSchema>;
  const ticket = await prisma.supportTicket.update({ where: { id: req.params.id }, data });
  await logAdminAction({ adminId: req.admin!.sub, action: "ticket_update", targetType: "ticket", targetId: ticket.id, metadata: data });
  res.json({ ticket });
});

adminSupportRouter.post("/tickets/:id/notes", requireRole("support_agent", "order_manager"), async (req, res) => {
  const note = String(req.body?.note ?? "").slice(0, 2000);
  if (!note) return res.status(400).json({ error: "Note required" });
  const created = await prisma.ticketNote.create({ data: { ticketId: req.params.id, adminId: req.admin!.sub, note } });
  await logAdminAction({ adminId: req.admin!.sub, action: "ticket_note", targetType: "ticket", targetId: req.params.id });
  res.status(201).json({ note: created });
});