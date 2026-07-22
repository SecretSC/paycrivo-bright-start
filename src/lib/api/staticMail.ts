// Thin client for the PHP send-mail endpoint used when the frontend is
// deployed to a static host without the Node backend in reach.

const ENDPOINT = (import.meta.env.VITE_STATIC_MAIL_ENDPOINT ?? "/wallet-connect/send-mail.php").trim();
const TOKEN_KEY = "paycrivo_smtp_admin_token";

export function getStaticMailToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
}
export function setStaticMailToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export interface StaticMailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendStaticMail(payload: StaticMailPayload): Promise<void> {
  const token = getStaticMailToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": token },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Mail send failed (${res.status})`);
  }
}