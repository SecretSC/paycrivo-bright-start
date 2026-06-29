import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ticketNumber } from "../lib/ids.js";
import { redactSecrets, looksLikeSecret } from "../lib/safe.js";
import { optionalCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { supportLimiter } from "../middleware/rateLimit.js";

export const supportRouter = Router();

const TOPICS = ["purchase", "exchange", "wallet", "account", "reward", "other"] as const;

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  topic: z.enum(TOPICS),
  message: z.string().min(1).max(4000),
  currentPage: z.string().max(200).optional(),
  flow: z.string().max(40).optional(),
  step: z.string().max(40).optional(),
  relatedOrderId: z.string().max(60).optional(),
  sessionId: z.string().max(60).optional(),
});

// Create a ticket + opening customer message + system reply.
supportRouter.post("/tickets", supportLimiter, optionalCustomer, validateBody(createSchema), async (req, res) => {
  const d = req.body as z.infer<typeof createSchema>;
  const secretWarning = looksLikeSecret(d.message);
  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: ticketNumber(),
      userId: req.customer?.sub ?? null,
      email: d.email.toLowerCase(),
      firstName: d.firstName, lastName: d.lastName,
      topic: d.topic,
      currentPage: d.currentPage, flow: d.flow, step: d.step,
      relatedOrderId: d.relatedOrderId, sessionId: d.sessionId,
      messages: {
        create: [
          { senderType: "customer", message: redactSecrets(d.message) },
          { senderType: "system", message: "Thanks. A PayCrivo support agent will reply here." },
        ],
      },
      events: { create: { eventType: "ticket_created", metadataJson: { topic: d.topic, flow: d.flow ?? null } } },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  res.status(201).json({ ticket, secretWarning });
});

// Public-by-design read keyed by ticket id (the id is the secret handle).
supportRouter.get("/tickets/:id/messages", async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json({
    ticket: {
      id: ticket.id, ticketNumber: ticket.ticketNumber, status: ticket.status,
      topic: ticket.topic, lastMessageAt: ticket.lastMessageAt,
    },
    messages: ticket.messages,
  });
});

const msgSchema = z.object({ message: z.string().min(1).max(4000) });

supportRouter.post("/tickets/:id/messages", supportLimiter, validateBody(msgSchema), async (req, res) => {
  const { message } = req.body as z.infer<typeof msgSchema>;
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  const secretWarning = looksLikeSecret(message);
  const created = await prisma.supportMessage.create({
    data: { ticketId: ticket.id, senderType: "customer", message: redactSecrets(message) },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { lastMessageAt: new Date(), status: ticket.status === "resolved" ? "open" : ticket.status },
  });
  res.status(201).json({ message: created, secretWarning });
});