// Order creation is quote-bound and idempotent.
// - Client references a server-issued quoteId + idempotencyKey.
// - Server verifies ownership, expiry, consumed-state before writing.
// - Persisted totals come from the quote row; NEVER from the request body.
// - Duplicate submissions return the SAME order (unique index enforces once-only).

import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { orderReference } from "../lib/ids.js";
import { requireCustomer, optionalCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Prisma } from "@prisma/client";

export const ordersRouter = Router();

const OWNERSHIP_STATES = [
  "not_started",
  "runtime_ready",
  "confirmation_pending",
  "manual_review",
  "confirmed",
  "failed",
  "timed_out",
  "runtime_unavailable",
] as const;

const createSchema = z.object({
  quoteId: z.string().min(4).max(120),
  idempotencyKey: z.string().min(8).max(128),
  sessionKey: z.string().min(8).max(128),
  email: z.string().email(),
  walletAddress: z.string().max(200),
  walletOwnership: z.enum(OWNERSHIP_STATES).optional(),
  destinationTag: z.string().max(100).optional(),
  // Non-authoritative safe metadata only (never used for totals).
  metadata: z
    .object({
      firstName: z.string().max(80).optional(),
      lastName: z.string().max(80).optional(),
      country: z.string().max(80).optional(),
      phone: z.string().max(40).optional(),
    })
    .partial()
    .optional(),
});

ordersRouter.post("/", optionalCustomer, validateBody(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  const userId = req.customer?.sub ?? null;

  // 1. Idempotency short-circuit.
  const existing = await prisma.order.findFirst({
    where: {
      idempotencyKey: data.idempotencyKey,
      OR: [
        userId ? { userId } : { userId: null },
        { sessionKey: data.sessionKey },
      ],
    },
  });
  if (existing) return res.status(200).json({ order: existing, idempotent: true });

  // 2. Load & verify the quote.
  const quote = await prisma.quote.findUnique({ where: { id: data.quoteId } });
  if (!quote) return res.status(404).json({ error: "Quote not found", code: "quote_not_found" });
  if (quote.consumed) return res.status(409).json({ error: "Quote has already been used.", code: "quote_consumed" });
  if (quote.expiresAt.getTime() < Date.now()) {
    return res.status(410).json({ error: "Quote has expired. Refresh and confirm the new price.", code: "quote_expired" });
  }
  const owned =
    (userId && quote.userId === userId) ||
    (!userId && quote.sessionKey === data.sessionKey);
  if (!owned) return res.status(403).json({ error: "Quote does not belong to this session.", code: "quote_not_owned" });

  // 3. Create order + mark quote consumed atomically.
  try {
    const order = await prisma.$transaction(async (tx) => {
      const consumed = await tx.quote.updateMany({
        where: { id: quote.id, consumed: false },
        data: { consumed: true },
      });
      if (consumed.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError(
          "Quote was consumed by another request",
          { code: "P2002", clientVersion: "n/a" },
        );
      }
      const created = await tx.order.create({
        data: {
          reference: orderReference(quote.type as "buy" | "exchange"),
          type: quote.type,
          userId,
          sessionKey: data.sessionKey,
          idempotencyKey: data.idempotencyKey,
          quoteId: quote.id,
          email: data.email.toLowerCase(),
          fiat: quote.fiat,
          spendAmount: String(quote.spendAmount),
          coin: quote.asset,
          receiveAmount: String(quote.receiveAmount),
          walletAddress: data.walletAddress,
          walletOwnership: data.walletOwnership ?? "not_started",
          priceUsd: quote.priceUsd,
          priceFiat: quote.priceFiat,
          fxRate: quote.fxRate,
          serviceFee: quote.serviceFee,
          networkFee: quote.networkFee,
          paycrivoFee: quote.paycrivoFee,
          totalFees: quote.totalFees,
          netAmount: quote.netAmount,
          priceStatus: quote.priceStatus,
          metadataJson: (data.metadata as object) ?? undefined,
          events: { create: { eventType: "order_created" } },
        },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { consumedOrderId: created.id } });
      return created;
    });
    return res.status(201).json({ order, idempotent: false });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const dup = await prisma.order.findFirst({
        where: {
          idempotencyKey: data.idempotencyKey,
          OR: [
            userId ? { userId } : { userId: null },
            { sessionKey: data.sessionKey },
          ],
        },
      });
      if (dup) return res.status(200).json({ order: dup, idempotent: true });
      return res.status(409).json({ error: "Duplicate order request", code: "duplicate" });
    }
    throw e;
  }
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