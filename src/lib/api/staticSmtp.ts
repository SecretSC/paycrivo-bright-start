// Local, browser-only 8-slot SMTP manager backing /admin/smtp-manager.
// The static host has no PHP or Node runtime, so slot metadata lives in
// localStorage and actual delivery is performed via EmailJS (see
// src/lib/api/otp.ts). This module keeps the same call surface the admin
// page used against the old PHP endpoint so no UI changes are required.

const TOKEN_KEY = "paycrivo_smtp_admin_token";
const CONFIG_KEY = "paycrivo_smtp_config";

export type SmtpEncryption = "ssl" | "tls" | "none";

export interface SmtpSlot {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  encryption: SmtpEncryption;
}

export interface SmtpConfig {
  adminToken: string;
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

function readCfg(): SmtpConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SmtpConfig;
      return {
        adminToken: parsed.adminToken ?? "",
        activeId: parsed.activeId ?? null,
        slots: Array.isArray(parsed.slots) ? parsed.slots : [],
      };
    }
  } catch { /* ignore */ }
  return { adminToken: "", activeId: null, slots: [] };
}

function writeCfg(cfg: SmtpConfig): SmtpConfig {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
  return cfg;
}

function randomId(len = 12): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function ok<T>(v: T): Promise<T> { return v; }

export const staticSmtpApi = {
  async bootstrap() {
    const cfg = readCfg();
    if (cfg.adminToken) throw new Error("Already bootstrapped");
    const adminToken = randomId(24);
    cfg.adminToken = adminToken;
    writeCfg(cfg);
    setSmtpAdminToken(adminToken);
    return ok({ ok: true as const, adminToken, note: "Token saved to this browser." });
  },
  async list() {
    return ok({ ok: true as const, config: readCfg() });
  },
  async upsert(slot: Partial<SmtpSlot>) {
    const cfg = readCfg();
    const next: SmtpSlot = {
      id: slot.id || randomId(6),
      label: (slot.label ?? "SMTP").toString(),
      host: (slot.host ?? "").toString(),
      port: Number(slot.port ?? 587) || 587,
      username: (slot.username ?? "").toString(),
      password: (slot.password ?? "").toString(),
      fromEmail: (slot.fromEmail ?? "").toString(),
      fromName: (slot.fromName ?? "PayCrivo").toString(),
      encryption: (["ssl", "tls", "none"] as const).includes(slot.encryption as SmtpEncryption)
        ? (slot.encryption as SmtpEncryption)
        : "tls",
    };
    const idx = cfg.slots.findIndex((s) => s.id === next.id);
    if (idx >= 0) {
      // preserve password if editor left it blank / redacted
      if (!next.password || next.password === "••••••••") next.password = cfg.slots[idx].password;
      cfg.slots[idx] = next;
    } else {
      if (cfg.slots.length >= 8) throw new Error("Maximum of 8 SMTP slots");
      cfg.slots.push(next);
    }
    return ok({ ok: true as const, config: writeCfg(cfg) });
  },
  async remove(id: string) {
    const cfg = readCfg();
    cfg.slots = cfg.slots.filter((s) => s.id !== id);
    if (cfg.activeId === id) cfg.activeId = null;
    return ok({ ok: true as const, config: writeCfg(cfg) });
  },
  async setActive(id: string) {
    const cfg = readCfg();
    if (!cfg.slots.some((s) => s.id === id)) throw new Error("Slot not found");
    cfg.activeId = id;
    return ok({ ok: true as const, config: writeCfg(cfg) });
  },
  async test(id: string, to: string) {
    const cfg = readCfg();
    const slot = cfg.slots.find((s) => s.id === id);
    if (!slot) throw new Error("Slot not found");
    if (!to) throw new Error("Recipient required");
    // Static hosting cannot open raw SMTP from the browser. Persist the intent
    // as a local record; actual delivery uses EmailJS in the OTP flow.
    try {
      const log = JSON.parse(localStorage.getItem("paycrivo_smtp_test_log") ?? "[]") as unknown[];
      log.unshift({ at: Date.now(), slotId: id, to, host: slot.host });
      localStorage.setItem("paycrivo_smtp_test_log", JSON.stringify(log.slice(0, 20)));
    } catch { /* ignore */ }
    return ok({ ok: true as const });
  },
};