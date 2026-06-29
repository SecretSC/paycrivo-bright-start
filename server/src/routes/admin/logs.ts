import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../middleware/auth.js";

export const adminLogsRouter = Router();
adminLogsRouter.use(requireAdmin);

adminLogsRouter.get("/", async (req, res) => {
  const { action, targetType } = req.query as Record<string, string | undefined>;
  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  const logs = await prisma.adminActionLog.findMany({
    where, orderBy: { createdAt: "desc" }, take: 300,
    include: { admin: { select: { email: true, name: true, role: true } } },
  });
  res.json({ logs });
});