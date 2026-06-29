import nodemailer from "nodemailer";
import { env } from "./env.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export function smtpConfigured(): boolean {
  return Boolean(env.smtp.host);
}

const SUBJECTS: Record<string, string> = {
  signup: "Your PayCrivo verification code",
  buy_checkout: "Confirm your PayCrivo purchase",
  exchange_checkout: "Confirm your PayCrivo exchange",
  forgot_password: "Reset your PayCrivo password",
  login_security: "PayCrivo security code",
};

export async function sendOtpEmail(to: string, purpose: string, code: string) {
  const t = getTransporter();
  const subject = SUBJECTS[purpose] ?? "Your PayCrivo code";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;background:#120a24;color:#fff;border-radius:16px;padding:32px">
      <h1 style="font-size:20px;margin:0 0 8px">PayCrivo</h1>
      <p style="color:#cbb9f0;margin:0 0 24px">${subject}</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:10px;background:#2b1259;border-radius:12px;padding:18px;text-align:center">${code}</div>
      <p style="color:#9b8ac4;font-size:13px;margin-top:24px">This code expires in ${env.otp.ttlMinutes} minutes. If you didn't request it, ignore this email. Never share this code or your wallet secrets with anyone.</p>
    </div>`;
  if (!t) {
    // Dev fallback: log so flows work without SMTP configured.
    console.log(`[email:dev] OTP for ${to} (${purpose}): ${code}`);
    return { delivered: false, devCode: code };
  }
  await t.sendMail({
    from: `${env.smtp.fromName} <${env.smtp.fromEmail}>`,
    to,
    subject,
    html,
    text: `Your PayCrivo code is ${code}. It expires in ${env.otp.ttlMinutes} minutes.`,
  });
  return { delivered: true };
}