import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { shortenAddress } from "../../lib/safe.js";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { logAdminAction } from "../../lib/log.js";

export const adminRewardsRouter = Router();
adminRewardsRouter.use(requireAdmin);

adminRewardsRouter.get("/", async (req, res) => {
  const { status } = req.query as Record<string, string | undefined>;
  const claims = await prisma.rewardClaim.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" }, take: 200,
  });
  res.json({ claims: claims.map((c) => ({ ...c, walletAddress: shortenAddress(c.walletAddress) })) });
});

// No real crypto is ever sent. Status is a review placeholder; never a tx hash.
const statusSchema = z.object({
  status: z.enum(["available", "pending", "queued", "completed", "rejected"]),
  note: z.string().max(2000).optional(),
});

adminRewardsRouter.patch("/:id/status", requireRole("order_manager", "support_agent"), validateBody(statusSchema), async (req, res) => {
  const { status, note } = req.body as z.infer<typeof statusSchema>;
  const claim = await prisma.rewardClaim.update({ where: { id: req.params.id }, data: { status, adminNote: note } });
  await logAdminAction({ adminId: req.admin!.sub, action: "reward_status", targetType: "reward", targetId: claim.id, metadata: { status } });
  res.json({ claim: { ...claim, walletAddress: shortenAddress(claim.walletAddress) } });
});