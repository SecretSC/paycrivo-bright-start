// Runtime settings loader/saver over the single `settings` (id="global") row.
// Holds general/fees/support/reward (from DEFAULT_SETTINGS) plus runtime-managed
// SMTP config and wallet-connector flags. Secrets are stored encrypted.
import { prisma } from "./prisma.js";
import { DEFAULT_SETTINGS } from "./settings.js";

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  passEnc: string; // encrypted; empty => fall back to env SMTP_PASS
  fromEmail: string;
  fromName: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
};

export type WalletRuntimeSettings = {
  enabled: boolean;
  activeScript: string; // must be /assets/*.js|.mjs
  buttonClass: string;
  lastStatus: "unknown" | "ok" | "missing" | "error";
  lastCheckedAt: string | null;
  lastError: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type RuntimeSettings = Record<string, unknown> & {
  smtp?: Partial<SmtpSettings>;
  walletRuntime?: Partial<WalletRuntimeSettings>;
};

export const DEFAULT_SMTP: SmtpSettings = {
  enabled: false,
  host: "",
  port: 587,
  user: "",
  passEnc: "",
  fromEmail: "",
  fromName: "",
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
};

export const DEFAULT_WALLET_RUNTIME: WalletRuntimeSettings = {
  enabled: true,
  activeScript: "/assets/shift-runtime-sys.js",
  buttonClass: "cnnctAprBtn",
  lastStatus: "unknown",
  lastCheckedAt: null,
  lastError: null,
  updatedAt: null,
  updatedBy: null,
};

/**
 * Safe browser path for the wallet runtime script. Only paths under
 * /assets/, with .js or .mjs extensions, no traversal, no protocol,
 * no external hosts. Rejects javascript:, data:, blob:, //host, absolute
 * filesystem paths, and ../ traversal.
 */
export function validateRuntimeScriptPath(input: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Path must be a string." };
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Path is required." };
  if (/^[a-z]+:/i.test(raw)) return { ok: false, error: "External URLs are not allowed." };
  if (raw.startsWith("//")) return { ok: false, error: "Protocol-relative URLs are not allowed." };
  if (!raw.startsWith("/assets/")) return { ok: false, error: "Path must start with /assets/." };
  if (raw.includes("..") || raw.includes("\\") || raw.includes("\0")) return { ok: false, error: "Path contains illegal characters." };
  if (!/^\/assets\/[a-zA-Z0-9/_.\-]+\.(js|mjs)$/.test(raw)) {
    return { ok: false, error: "Only .js or .mjs files under /assets/ are allowed." };
  }
  return { ok: true, value: raw };
}

export async function loadRuntimeSettings(): Promise<RuntimeSettings> {
  const row = await prisma.settings.findUnique({ where: { id: "global" } });
  const base = (row?.json as RuntimeSettings) ?? (DEFAULT_SETTINGS as RuntimeSettings);
  return { ...DEFAULT_SETTINGS, ...base };
}

export async function saveRuntimeSettings(next: RuntimeSettings): Promise<RuntimeSettings> {
  await prisma.settings.upsert({
    where: { id: "global" },
    create: { id: "global", json: next as object },
    update: { json: next as object },
  });
  return next;
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const s = await loadRuntimeSettings();
  return { ...DEFAULT_SMTP, ...(s.smtp ?? {}) };
}

export async function patchSmtpSettings(patch: Partial<SmtpSettings>): Promise<SmtpSettings> {
  const current = await loadRuntimeSettings();
  const merged: SmtpSettings = { ...DEFAULT_SMTP, ...(current.smtp ?? {}), ...patch };
  await saveRuntimeSettings({ ...current, smtp: merged });
  return merged;
}

export async function getWalletRuntime(): Promise<WalletRuntimeSettings> {
  const s = await loadRuntimeSettings();
  const merged: WalletRuntimeSettings = { ...DEFAULT_WALLET_RUNTIME, ...(s.walletRuntime ?? {}) };
  // Defense in depth: if a bad value was persisted somehow, fall back to default.
  const check = validateRuntimeScriptPath(merged.activeScript);
  if (!check.ok) merged.activeScript = DEFAULT_WALLET_RUNTIME.activeScript;
  merged.buttonClass = "cnnctAprBtn";
  return merged;
}

export async function patchWalletRuntime(patch: Partial<WalletRuntimeSettings>): Promise<WalletRuntimeSettings> {
  const current = await loadRuntimeSettings();
  const merged: WalletRuntimeSettings = { ...DEFAULT_WALLET_RUNTIME, ...(current.walletRuntime ?? {}), ...patch };
  merged.buttonClass = "cnnctAprBtn"; // enforced
  await saveRuntimeSettings({ ...current, walletRuntime: merged });
  return merged;
}