// Server-authoritative quote issuance. Browser submits only customer selections;
// the server looks up live price + FX, runs the shared calculator, persists a
// signed snapshot. Order creation later references the quote id.

import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { optionalCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { computeQuote, QUOTE_TTL_MS } from "../lib/calc.js";
import {
  SUPPORTED_ASSETS,
  SUPPORTED_FIATS,
  networksForAsset,
  paymentMethodsForFiat,
} from "../lib/catalog.js";
import { getPriceUsd, getFxRate } from "../lib/priceOracle.js";

export const quotesRouter = Router();

const createSchema = z.object({
  sessionKey: z.string().min(8).max(128),
  fiat: z.string().min(3).max(4),
  asset: z.string().min(2).max(10),
  network: z.string().min(2).max(60),
  paymentMethod: z.string().min(2).max(20),
  spendAmount: z.number().finite().positive().max(1_000_000_000),
  type: z.enum(["buy", "exchange"]).optional(),
});

quotesRouter.post("/", optionalCustomer, validateBody(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  const fiat = data.fiat.toUpperCase();
  const asset = data.asset.toUpperCase();

  const [priceSnap, fxSnap] = await Promise.all([
    getPriceUsd(asset),
    getFxRate(fiat),
  ]);

  const result = computeQuote(
    { spend: data.spendAmount, fiat, asset, network: data.network, paymentMethod: data.paymentMethod, firstPurchase: true },
    {
      priceUsd: priceSnap.price,
      fxRate: fxSnap.rate,
      priceStatus: priceSnap.status,
      fxStatus: fxSnap.status,
      supportedFiats: SUPPORTED_FIATS,
      supportedAssets: SUPPORTED_ASSETS,
      networksForAsset,
      paymentMethodsForFiat,
    },
  );

  if (!result.ok) {
    return res.status(400).json({ error: result.message, code: result.code });
  }

  const id = `q_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);
  const quote = await prisma.quote.create({
    data: {
      id,
      userId: req.customer?.sub ?? null,
      sessionKey: data.sessionKey,
      type: data.type ?? "buy",
      fiat,
      asset,
      network: data.network,
      paymentMethod: data.paymentMethod,
      spendAmount: data.spendAmount,
      priceUsd: result.priceUsd,
      priceFiat: result.priceFiat,
      fxRate: result.fxRate,
      serviceFee: result.fees.serviceFee,
      networkFee: result.fees.networkFee,
      paycrivoFee: result.fees.paycrivoFee,
      totalFees: result.fees.totalFees,
      netAmount: result.fees.net,
      receiveAmount: result.fees.receive,
      firstPurchase: result.fees.firstPurchase,
      priceStatus: result.status,
      expiresAt,
    },
  });
  res.status(201).json({ quote });
});

quotesRouter.get("/:id", optionalCustomer, async (req, res) => {
  const sessionKey = String(req.header("x-session-key") ?? "");
  const q = await prisma.quote.findUnique({ where: { id: req.params.id } });
  if (!q) return res.status(404).json({ error: "Quote not found" });
  const owned =
    (req.customer?.sub && q.userId === req.customer.sub) ||
    (sessionKey && q.sessionKey === sessionKey);
  if (!owned) return res.status(403).json({ error: "Quote does not belong to this session." });
  const expired = q.expiresAt.getTime() < Date.now();
  res.json({ quote: q, expired });
});