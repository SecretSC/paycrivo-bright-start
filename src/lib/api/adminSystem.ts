// Admin system management API: SMTP settings and wallet-connector scripts.
// Wired to the standalone Express backend. These are admin-only operations that
// require a configured backend; in the Lovable preview they surface a clear
// "backend required" error instead of a silent local fallback (these manage
// real production infrastructure that has no meaningful local mock).
import { apiFetch, isBackendConfigured } from "./client";

function requireBackend() {
  if (!isBackendConfigured()) {
    throw new Error("Connect the PayCrivo backend to manage SMTP and wallet connectors.");
  }
}

export type SmtpStatus = {
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    userMasked: string;
    fromEmail: string;
    fromName: string;
    hasPassword: boolean;
    passwordMasked: string;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
  };
  effective: {
    source: "db" | "env" | "none";
    host: string;
    port: number;
    fromEmail: string;
    fromName: string;
    configured: boolean;
  };
  envFallback: { host: string | null; fromEmail: string };
};

export type SmtpPatch = {
  enabled?: boolean;
  host?: string;
  port?: number;
  user?: string;
  fromEmail?: string;
  fromName?: string;
  password?: string;
};

export const adminSmtpApi = {
  async get(): Promise<SmtpStatus> {
    requireBackend();
    return apiFetch<SmtpStatus>("/api/admin/smtp", { auth: "admin" });
  },
  async update(patch: SmtpPatch): Promise<void> {
    requireBackend();
    await apiFetch("/api/admin/smtp", { method: "PATCH", auth: "admin", body: patch });
  },
  async sendTest(to: string): Promise<{ message: string }> {
    requireBackend();
    return apiFetch("/api/admin/smtp/test", { method: "POST", auth: "admin", body: { to } });
  },
  async sendTestCode(to: string): Promise<{ message: string; code: string }> {
    requireBackend();
    return apiFetch("/api/admin/smtp/test-code", { method: "POST", auth: "admin", body: { to } });
  },
};

export type ConnectorFile = {
  key: "meta" | "tron" | "tron-settings";
  label: string;
  ext: ".js" | ".json";
  publicPath: string;
  publicUrl: string;
  enabled: boolean;
  exists: boolean;
  size: number;
  modifiedAt: string | null;
};

export type ConnectorList = {
  files: ConnectorFile[];
  flags: { metaEnabled: boolean; tronEnabled: boolean };
};

export const adminConnectorsApi = {
  async list(): Promise<ConnectorList> {
    requireBackend();
    return apiFetch<ConnectorList>("/api/admin/connectors", { auth: "admin" });
  },
  async content(key: string): Promise<{ content: string; missing?: boolean }> {
    requireBackend();
    return apiFetch(`/api/admin/connectors/${encodeURIComponent(key)}/content`, { auth: "admin" });
  },
  async replace(key: string, content: string): Promise<void> {
    requireBackend();
    await apiFetch(`/api/admin/connectors/${encodeURIComponent(key)}`, { method: "PUT", auth: "admin", body: { content } });
  },
  async setFlags(flags: { metaEnabled?: boolean; tronEnabled?: boolean }): Promise<void> {
    requireBackend();
    await apiFetch("/api/admin/connectors/flags", { method: "PATCH", auth: "admin", body: flags });
  },
  async verify(): Promise<{ results: { key: string; url: string; status: number; ok: boolean }[] }> {
    requireBackend();
    return apiFetch("/api/admin/connectors/verify", { auth: "admin" });
  },
};
