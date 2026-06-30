import dotenv from "dotenv";
dotenv.config();

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const requiredCorsOrigins = ["https://paycrivo.com", "https://www.paycrivo.com"];
const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:8080,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 4100),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: Array.from(new Set([...configuredCorsOrigins, ...requiredCorsOrigins])),
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
    fromEmail: process.env.SMTP_FROM_EMAIL ?? "noreply@panema.it",
    fromName: process.env.SMTP_FROM_NAME ?? "PayCrivo",
  },
  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
  },
  // Key used to encrypt secrets (e.g. SMTP password) stored in the settings row.
  // Falls back to the admin JWT secret so encryption always has a key in dev.
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY ?? req("JWT_ADMIN_SECRET", "dev-admin-secret"),
  // Public site base URL — used to verify connector asset URLs return 200.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "https://paycrivo.com").replace(/\/+$/, ""),
  connector: {
    // Directory that serves /assets/*.js on the public site. Configure per host.
    dir: process.env.CONNECTOR_DIR ?? "/var/www/paycrivo.com/public/assets",
    // Full path to /tron-settings.json on the public site.
    tronSettingsPath: process.env.TRON_SETTINGS_PATH ?? "/var/www/paycrivo.com/public/tron-settings.json",
  },
};