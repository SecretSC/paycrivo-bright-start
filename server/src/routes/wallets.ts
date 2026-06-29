import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const walletsRouter = Router();

walletsRouter.get("/", requireCustomer, async (req, res) => {
  const wallets = await prisma.wallet.findMany({
    where: { userId: req.customer!.sub },
    orderBy: { createdAt: "desc" },
  });
  res.json({ wallets });
});

const createSchema = z.object({
  coin: z.string().max(20),
  network: z.string().max(40).optional(),
  address: z.string().min(4).max(200),
  nickname: z.string().max(60).optional(),
  isDefault: z.boolean().optional(),
});

walletsRouter.post("/", requireCustomer, validateBody(createSchema), async (req, res) => {
  const data = req.body as z.infer<typeof createSchema>;
  if (data.isDefault) {
    await prisma.wallet.updateMany({ where: { userId: req.customer!.sub }, data: { isDefault: false } });
  }
  const wallet = await prisma.wallet.create({
    data: { ...data, userId: req.customer!.sub },
  });
  res.status(201).json({ wallet });
});

walletsRouter.delete("/:id", requireCustomer, async (req, res) => {
  await prisma.wallet.deleteMany({ where: { id: req.params.id, userId: req.customer!.sub } });
  res.json({ ok: true });
});