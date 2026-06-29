import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword, isStrongPassword } from "../lib/password.js";
import { signCustomer } from "../lib/jwt.js";
import { validateBody } from "../middleware/validate.js";
import { requireCustomer } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  preferredFiat: z.string().max(8).optional(),
});

function publicUser(u: {
  id: string; email: string; firstName: string | null; lastName: string | null;
  country: string | null; phone: string | null; preferredFiat: string | null;
  emailVerified: boolean; status: string; createdAt: Date; lastLoginAt: Date | null;
}) {
  return {
    id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
    country: u.country, phone: u.phone, preferredFiat: u.preferredFiat,
    emailVerified: u.emailVerified, status: u.status,
    createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
  };
}

authRouter.post("/signup", validateBody(signupSchema), async (req, res) => {
  const { email, password, ...rest } = req.body as z.infer<typeof signupSchema>;
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: "Weak password. Use 8+ chars with upper, lower, number, and symbol." });
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash: await hashPassword(password), ...rest },
  });
  const token = signCustomer({ sub: user.id, email: user.email });
  res.status(201).json({ token, user: publicUser(user) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post("/login", loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.status === "suspended") return res.status(403).json({ error: "Account suspended." });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = signCustomer({ sub: user.id, email: user.email });
  res.json({ token, user: publicUser(user) });
});

// Stateless JWT — logout is client-side token disposal. Endpoint provided for symmetry.
authRouter.post("/logout", (_req, res) => res.json({ ok: true }));

authRouter.get("/me", requireCustomer, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.customer!.sub } });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user: publicUser(user) });
});