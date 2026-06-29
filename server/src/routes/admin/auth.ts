import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { verifyPassword } from "../../lib/password.js";
import { signAdmin } from "../../lib/jwt.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAdmin } from "../../middleware/auth.js";
import { loginLimiter } from "../../middleware/rateLimit.js";
import { logAdminAction } from "../../lib/log.js";

export const adminAuthRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

adminAuthRouter.post("/login", loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin || admin.status !== "active" || !(await verifyPassword(admin.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await logAdminAction({ adminId: admin.id, action: "admin_login" });
  const token = signAdmin({ sub: admin.id, email: admin.email, role: admin.role });
  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});

adminAuthRouter.post("/logout", requireAdmin, async (req, res) => {
  await logAdminAction({ adminId: req.admin!.sub, action: "admin_logout" });
  res.json({ ok: true });
});

adminAuthRouter.get("/me", requireAdmin, async (req, res) => {
  const admin = await prisma.adminUser.findUnique({ where: { id: req.admin!.sub } });
  if (!admin) return res.status(404).json({ error: "Not found" });
  res.json({ admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});