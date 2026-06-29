import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import type { Response } from "express";
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

function isMissingTableError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

function databaseSetupError(res: Response) {
  return res.status(503).json({
    success: false,
    error: "Email verification is temporarily unavailable while the database is being prepared. Please try again shortly.",
    code: "DATABASE_MIGRATION_REQUIRED",
  });
}

const sendSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(PURPOSES),
});

emailRouter.post("/send-code", otpLimiter, validateBody(sendSchema), async (req, res) => {
  let pendingCode: { email: string; purpose: (typeof PURPOSES)[number] } | null = null;
  try {
    const { email, purpose } = req.body as z.infer<typeof sendSchema>;
    const e = email.toLowerCase();
    await prisma.emailCode.deleteMany({
      where: {
        email: e,
        purpose,
        OR: [{ consumed: true }, { expiresAt: { lt: new Date() } }],
      },
    });
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
    pendingCode = { email: e, purpose };
    const result = await sendOtpEmail(e, purpose, code);
    if (!result.delivered && env.nodeEnv === "production") {
      await prisma.emailCode.deleteMany({ where: { email: e, purpose, consumed: false } });
      return res.status(503).json({ success: false, error: "Email delivery is not configured." });
    }
    res.json({
      success: true,
      cooldown: env.otp.resendCooldownSeconds,
      // devCode only when SMTP is not configured in local development. Never in production.
      devCode: env.nodeEnv === "production" || result.delivered ? undefined : result.devCode,
    });
  } catch (error) {
    if (isMissingTableError(error)) return databaseSetupError(res);
    if (pendingCode) {
      await prisma.emailCode.deleteMany({
        where: { email: pendingCode.email, purpose: pendingCode.purpose, consumed: false },
      }).catch(() => undefined);
    }
    console.error("[email/send-code]", error);
    return res.status(502).json({ success: false, error: "We couldn't send the email right now. Please try again." });
  }
});

const verifySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(PURPOSES),
  code: z.string().min(4).max(8),
});

emailRouter.post("/verify-code", otpLimiter, validateBody(verifySchema), async (req, res) => {
  try {
    const { email, purpose, code } = req.body as z.infer<typeof verifySchema>;
    const e = email.toLowerCase();
    const record = await prisma.emailCode.findFirst({
      where: { email: e, purpose, consumed: false },
      orderBy: { createdAt: "desc" },
    });
    if (!record) return res.status(400).json({ success: false, error: "No active code. Request a new one." });
    if (record.expiresAt < new Date()) {
      await prisma.emailCode.delete({ where: { id: record.id } });
      return res.status(400).json({ success: false, expired: true, error: "Code expired. Request a new one." });
    }
    if (record.attempts >= env.otp.maxAttempts) {
      await prisma.emailCode.delete({ where: { id: record.id } });
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
    await prisma.emailCode.delete({ where: { id: record.id } });
    // Mark a matching user verified (signup/checkout flows).
    await prisma.user.updateMany({ where: { email: e }, data: { emailVerified: true } });
    res.json({ success: true });
  } catch (error) {
    if (isMissingTableError(error)) return databaseSetupError(res);
    console.error("[email/verify-code]", error);
    return res.status(500).json({ success: false, error: "Verification failed. Please try again." });
  }
});