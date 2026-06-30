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

export type ConnectorFlags = {
  metaEnabled: boolean;
  tronEnabled: boolean;
};

export type RuntimeSettings = Record<string, unknown> & {
  smtp?: Partial<SmtpSettings>;
  connectors?: Partial<ConnectorFlags>;
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

export const DEFAULT_CONNECTORS: ConnectorFlags = { metaEnabled: true, tronEnabled: true };

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

export async function getConnectorFlags(): Promise<ConnectorFlags> {
  const s = await loadRuntimeSettings();
  return { ...DEFAULT_CONNECTORS, ...(s.connectors ?? {}) };
}

export async function patchConnectorFlags(patch: Partial<ConnectorFlags>): Promise<ConnectorFlags> {
  const current = await loadRuntimeSettings();
  const merged: ConnectorFlags = { ...DEFAULT_CONNECTORS, ...(current.connectors ?? {}), ...patch };
  await saveRuntimeSettings({ ...current, connectors: merged });
  return merged;
}