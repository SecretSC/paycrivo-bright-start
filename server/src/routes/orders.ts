import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { orderReference } from "../lib/ids.js";
import { requireCustomer, optionalCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const ordersRouter = Router();

const createSchema = z.object({
  type: z.enum(["buy", "exchange"]),
  email: z.string().email(),
  fiat: z.string().max(8).optional(),
  spendAmount: z.string().max(40).optional(),
  sendCoin: z.string().max(20).optional(),
  sendAmount: z.string().max(40).optional(),
  receiveCoin: z.string().max(20).optional(),
  receiveAmount: z.string().max(40).optional(),
  coin: z.string().max(20).optional(),
  walletAddress: z.string().max(200).optional(),
  walletOwnership: z.enum(["confirmed", "manual"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

ordersRouter.post("/", optionalCustomer, validateBody(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  const order = await prisma.order.create({
    data: {
      reference: orderReference(data.type),
      type: data.type,
      userId: req.customer?.sub ?? null,
      email: data.email.toLowerCase(),
      fiat: data.fiat, spendAmount: data.spendAmount,
      sendCoin: data.sendCoin, sendAmount: data.sendAmount,
      receiveCoin: data.receiveCoin, receiveAmount: data.receiveAmount,
      coin: data.coin, walletAddress: data.walletAddress,
      walletOwnership: data.walletOwnership ?? "manual",
      metadataJson: (data.metadata as object) ?? undefined,
      events: { create: { eventType: "order_created" } },
    },
  });
  res.status(201).json({ order });
});

ordersRouter.get("/", requireCustomer, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: req.customer!.sub }, { email: req.customer!.email }] },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

ordersRouter.get("/:id", requireCustomer, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id: req.params.id }, { reference: req.params.id }],
      AND: { OR: [{ userId: req.customer!.sub }, { email: req.customer!.email }] },
    },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});