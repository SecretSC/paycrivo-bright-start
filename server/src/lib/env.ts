import dotenv from "dotenv";
dotenv.config();

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4100),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: req("DATABASE_URL", "postgresql://localhost:5432/paycrivo"),
  jwtCustomerSecret: req("JWT_CUSTOMER_SECRET", "dev-customer-secret"),
  jwtAdminSecret: req("JWT_ADMIN_SECRET", "dev-admin-secret"),
  jwtCustomerTtl: process.env.JWT_CUSTOMER_TTL ?? "7d",
  jwtAdminTtl: process.env.JWT_ADMIN_TTL ?? "12h",
  admin: {
    email: process.env.ADMIN_EMAIL ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
    name: process.env.ADMIN_NAME ?? "PayCrivo Admin",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    fromEmail: process.env.SMTP_FROM_EMAIL ?? "no-reply@paycrivo.com",
    fromName: process.env.SMTP_FROM_NAME ?? "PayCrivo",
  },
  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
  },
};