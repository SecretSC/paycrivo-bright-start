import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../lib/env.js";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { logAdminAction } from "../../lib/log.js";
import { DEFAULT_SETTINGS } from "../../lib/settings.js";

export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAdmin);

async function loadSettings() {
  const row = await prisma.settings.findUnique({ where: { id: "global" } });
  return (row?.json as object) ?? DEFAULT_SETTINGS;
}

adminSettingsRouter.get("/", async (_req, res) => {
  const settings = await loadSettings();
  // SMTP password is NEVER returned — masked only.
  res.json({
    settings,
    email: {
      smtpConfigured: Boolean(env.smtp.host),
      host: env.smtp.host || null,
      port: env.smtp.port,
      fromEmail: env.smtp.fromEmail,
      fromName: env.smtp.fromName,
      smtpPasswordMasked: env.smtp.pass ? "********" : "",
      otpTtlMinutes: env.otp.ttlMinutes,
      otpMaxAttempts: env.otp.maxAttempts,
      resendCooldownSeconds: env.otp.resendCooldownSeconds,
    },
  });
});

adminSettingsRouter.patch("/", requireRole("super_admin"), async (req, res) => {
  const incoming = req.body?.settings ?? {};
  // Strip any attempt to set smtp secrets via the API.
  delete incoming.smtpPass;
  delete incoming.smtpPassword;
  const current = await loadSettings();
  const merged = { ...current, ...incoming };
  await prisma.settings.upsert({
    where: { id: "global" },
    create: { id: "global", json: merged },
    update: { json: merged },
  });
  await logAdminAction({ adminId: req.admin!.sub, action: "settings_update", targetType: "settings" });
  res.json({ settings: merged });
});