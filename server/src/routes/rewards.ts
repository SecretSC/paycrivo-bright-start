import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireCustomer } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

export const rewardsRouter = Router();

const REWARD_AMOUNT_USD = 20;

// Get (or lazily create) the signed-in user's single welcome reward claim.
rewardsRouter.get("/", requireCustomer, async (req, res) => {
  const userId = req.customer!.sub;
  let claim = await prisma.rewardClaim.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!claim) {
    claim = await prisma.rewardClaim.create({
      data: { userId, email: req.customer!.email, amountUsd: REWARD_AMOUNT_USD, status: "available" },
    });
  }
  res.json({ claim });
});

// No real crypto is ever sent. Submitting a claim sets it to "pending" review.
const claimSchema = z.object({
  selectedAsset: z.string().max(20),
  selectedNetwork: z.string().max(40),
  walletAddress: z.string().min(4).max(200),
  walletOwnership: z.enum(["confirmed", "manual"]).optional(),
});

rewardsRouter.post("/claim", requireCustomer, validateBody(claimSchema), async (req, res) => {
  const userId = req.customer!.sub;
  const d = req.body as z.infer<typeof claimSchema>;
  let claim = await prisma.rewardClaim.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!claim) {
    claim = await prisma.rewardClaim.create({
      data: { userId, email: req.customer!.email, amountUsd: REWARD_AMOUNT_USD, status: "available" },
    });
  }
  if (claim.status !== "available") {
    return res.status(409).json({ error: "Reward already claimed.", claim });
  }
  const updated = await prisma.rewardClaim.update({
    where: { id: claim.id },
    data: {
      status: "pending",
      selectedAsset: d.selectedAsset,
      selectedNetwork: d.selectedNetwork,
      walletAddress: d.walletAddress,
      walletOwnership: d.walletOwnership ?? "manual",
    },
  });
  res.status(201).json({ claim: updated });
});
