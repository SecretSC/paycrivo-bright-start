// Client for /wallet-connect/smtp-manage.php — 8-slot SMTP manager backing
// the /admin/smtp-manager page. Token stored in localStorage.

const ENDPOINT = (import.meta.env.VITE_STATIC_SMTP_MANAGE_ENDPOINT ?? "/wallet-connect/smtp-manage.php").trim();
const TOKEN_KEY = "paycrivo_smtp_admin_token";

export type SmtpEncryption = "ssl" | "tls" | "none";

export interface SmtpSlot {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  password: string; // "" or "••••••••" when server-redacted
  fromEmail: string;
  fromName: string;
  encryption: SmtpEncryption;
}

export interface SmtpConfig {
  adminToken: string; // redacted from server
  activeId: string | null;
  slots: SmtpSlot[];
}

function token(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}
export function setSmtpAdminToken(t: string) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}
export function getSmtpAdminToken(): string { return token(); }

async function call<T = unknown>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": token() },
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const staticSmtpApi = {
  bootstrap: () => call<{ ok: true; adminToken: string; note: string }>("bootstrap"),
  list: () => call<{ ok: true; config: SmtpConfig }>("list"),
  upsert: (slot: Partial<SmtpSlot>) => call<{ ok: true; config: SmtpConfig }>("upsert", { slot }),
  remove: (id: string) => call<{ ok: true; config: SmtpConfig }>("remove", { id }),
  setActive: (id: string) => call<{ ok: true; config: SmtpConfig }>("setActive", { id }),
  test: (id: string, to: string) => call<{ ok: true }>("test", { id, to }),
};