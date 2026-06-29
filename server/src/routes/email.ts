import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { sendOtpEmail } from "../lib/email.js";
import { validateBody } from "../middleware/validate.js";
import { otpLimiter } from "../middleware/rateLimit.js";

export const emailRouter = Router();

const PURPOSES = ["signup", "buy_checkout", "exchange_checkout", "forgot_password", "login_security"] as const;

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

const sendSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(PURPOSES),
});

emailRouter.post("/send-code", otpLimiter, validateBody(sendSchema), async (req, res) => {
  const { email, purpose } = req.body as z.infer<typeof sendSchema>;
  const e = email.toLowerCase();
  const last = await prisma.emailCode.findFirst({
    where: { email: e, purpose, consumed: false },
    orderBy: { lastSentAt: "desc" },
  });
  if (last) {
    const elapsed = (Date.now() - last.lastSentAt.getTime()) / 1000;
    if (elapsed < env.otp.resendCooldownSeconds) {
      return res.status(429).json({
        success: false,
        cooldownRemaining: Math.ceil(env.otp.resendCooldownSeconds - elapsed),
        error: "Please wait before requesting a new code.",
      });
    }
  }
  const code = String(Math.floor(1000 + Math.random() * 9000));
  await prisma.emailCode.deleteMany({ where: { email: e, purpose, consumed: false } });
  await prisma.emailCode.create({
    data: {
      email: e, purpose, codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + env.otp.ttlMinutes * 60_000),
    },
  });
  const result = await sendOtpEmail(e, purpose, code);
  res.json({
    success: true,
    cooldown: env.otp.resendCooldownSeconds,
    // devCode only when SMTP not configured (local dev). Never in production.
    devCode: result.delivered ? undefined : result.devCode,
  });
});

const verifySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(PURPOSES),
  code: z.string().min(4).max(8),
});

emailRouter.post("/verify-code", otpLimiter, validateBody(verifySchema), async (req, res) => {
  const { email, purpose, code } = req.body as z.infer<typeof verifySchema>;
  const e = email.toLowerCase();
  const record = await prisma.emailCode.findFirst({
    where: { email: e, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return res.status(400).json({ success: false, error: "No active code. Request a new one." });
  if (record.expiresAt < new Date()) {
    return res.status(400).json({ success: false, expired: true, error: "Code expired. Request a new one." });
  }
  if (record.attempts >= env.otp.maxAttempts) {
    return res.status(429).json({ success: false, blocked: true, error: "Too many attempts. Request a new code." });
  }
  if (record.codeHash !== hashCode(code)) {
    const updated = await prisma.emailCode.update({
      where: { id: record.id }, data: { attempts: { increment: 1 } },
    });
    return res.status(400).json({
      success: false,
      remainingAttempts: Math.max(0, env.otp.maxAttempts - updated.attempts),
      error: "Incorrect code.",
    });
  }
  await prisma.emailCode.update({ where: { id: record.id }, data: { consumed: true } });
  // Mark a matching user verified (signup/checkout flows).
  await prisma.user.updateMany({ where: { email: e }, data: { emailVerified: true } });
  res.json({ success: true });
});