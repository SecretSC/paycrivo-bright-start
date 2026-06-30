// Admin → Settings → SMTP Settings (Phase: SMTP manager).
// View status, edit host/port/user/from, replace password, enable/disable,
// send a test email and a test verification code. The password is never
// returned (masked only) and is stored encrypted. Writes are super_admin only
// and every change/test is written to the admin audit log. DB SMTP falls back
// to .env SMTP so currently-working delivery is never broken.
import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireRole } from "../../middleware/auth.js";
import { logAdminAction } from "../../lib/log.js";
import { getSmtpSettings, patchSmtpSettings } from "../../lib/runtimeSettings.js";
import { encryptSecret } from "../../lib/secretsCrypto.js";
import { resolveSmtp, sendRawEmail, otpEmailHtml } from "../../lib/email.js";
import { env } from "../../lib/env.js";

export const adminSmtpRouter = Router();
adminSmtpRouter.use(requireAdmin);

function maskUser(user: string): string {
  if (!user) return "";
  const [name, domain] = user.split("@");
  if (!domain) return user.length > 4 ? `${user.slice(0, 2)}***` : "***";
  return `${name.slice(0, 2)}***@${domain}`;
}

adminSmtpRouter.get("/", async (_req, res) => {
  const db = await getSmtpSettings();
  const effective = await resolveSmtp();
  res.json({
    smtp: {
      enabled: db.enabled,
      host: db.host,
      port: db.port,
      user: db.user,
      userMasked: maskUser(db.user),
      fromEmail: db.fromEmail,
      fromName: db.fromName,
      hasPassword: Boolean(db.passEnc),
      passwordMasked: db.passEnc ? "••••••••" : "",
      lastSuccessAt: db.lastSuccessAt,
      lastErrorAt: db.lastErrorAt,
      lastError: db.lastError,
    },
    effective: {
      source: effective.source, // "db" | "env" | "none"
      host: effective.host,
      port: effective.port,
      fromEmail: effective.fromEmail,
      fromName: effective.fromName,
      configured: Boolean(effective.host),
    },
    envFallback: {
      host: env.smtp.host || null,
      fromEmail: env.smtp.fromEmail,
    },
  });
});

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().max(255).optional(),
  fromEmail: z.string().email().max(255).optional(),
  fromName: z.string().max(120).optional(),
  // password is optional; when present & non-empty it replaces the stored one.
  password: z.string().max(512).optional(),
});

adminSmtpRouter.patch("/", requireRole("super_admin"), async (req, res) => {
  const parsed = patchSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "Invalid SMTP settings", details: parsed.error.flatten() });
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  for (const k of ["enabled", "host", "port", "user", "fromEmail", "fromName"] as const) {
    if (d[k] !== undefined) patch[k] = d[k];
  }
  if (d.password) patch.passEnc = encryptSecret(d.password);
  const saved = await patchSmtpSettings(patch);
  await logAdminAction({
    adminId: req.admin!.sub,
    action: "smtp_settings_update",
    targetType: "settings",
    metadata: { fields: Object.keys(patch).filter((k) => k !== "passEnc"), passwordChanged: Boolean(d.password) },
  });
  res.json({ ok: true, smtp: { ...saved, passEnc: undefined, hasPassword: Boolean(saved.passEnc) } });
});

const testSchema = z.object({ to: z.string().email() });

adminSmtpRouter.post("/test", requireRole("super_admin"), async (req, res) => {
  const parsed = testSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "A valid recipient email is required." });
  try {
    await sendRawEmail(
      parsed.data.to,
      "PayCrivo SMTP test email",
      otpEmailHtml("This is a test email confirming SMTP works.", "TEST"),
      "PayCrivo SMTP test email — your SMTP configuration is working.",
    );
    await logAdminAction({ adminId: req.admin!.sub, action: "smtp_test_email", targetType: "settings", metadata: { to: parsed.data.to } });
    res.json({ ok: true, message: "Test email sent." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send test email.";
    await logAdminAction({ adminId: req.admin!.sub, action: "smtp_test_email_failed", targetType: "settings", metadata: { to: parsed.data.to, error: msg } });
    res.status(502).json({ ok: false, error: msg });
  }
});

adminSmtpRouter.post("/test-code", requireRole("super_admin"), async (req, res) => {
  const parsed = testSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "A valid recipient email is required." });
  const code = String(Math.floor(1000 + Math.random() * 9000));
  try {
    await sendRawEmail(
      parsed.data.to,
      "Your PayCrivo verification code (test)",
      otpEmailHtml("Your verification code (test)", code),
      `Your PayCrivo test verification code is ${code}.`,
    );
    await logAdminAction({ adminId: req.admin!.sub, action: "smtp_test_code", targetType: "settings", metadata: { to: parsed.data.to } });
    // The code is returned so the admin can confirm delivery matches.
    res.json({ ok: true, message: "Test verification code sent.", code });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send test code.";
    await logAdminAction({ adminId: req.admin!.sub, action: "smtp_test_code_failed", targetType: "settings", metadata: { to: parsed.data.to, error: msg } });
    res.status(502).json({ ok: false, error: msg });
  }
});