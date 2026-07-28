// Admin system management API: SMTP settings and universal wallet runtime.
// Wired to the standalone Express backend. These are admin-only operations
// that require a configured backend; in the Lovable preview they surface a
// clear "backend required" error instead of a silent local fallback (these
// manage real production infrastructure with no meaningful local mock).
import { apiFetch, isBackendConfigured } from "./client";

function requireBackend() {
  if (!isBackendConfigured()) {
    throw new Error("Connect the PayCrivo backend to manage SMTP and the wallet runtime.");
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

export type WalletRuntimeAdmin = {
  enabled: boolean;
  activeScript: string;
  buttonClass: string;
  lastStatus: "unknown" | "ok" | "missing" | "error";
  lastCheckedAt: string | null;
  lastError: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type WalletRuntimeProbe =
  | { status: "ok"; size: number; modifiedAt: string }
  | { status: "missing"; error: string };

export type WalletRuntimeStatus = {
  walletRuntime: WalletRuntimeAdmin;
  probe: WalletRuntimeProbe;
  publicUrl: string;
};

export const adminWalletRuntimeApi = {
  async get(): Promise<WalletRuntimeStatus> {
    requireBackend();
    return apiFetch<WalletRuntimeStatus>("/api/admin/wallet-runtime", { auth: "admin" });
  },
  async update(patch: { enabled?: boolean; activeScript?: string }): Promise<{ walletRuntime: WalletRuntimeAdmin }> {
    requireBackend();
    return apiFetch("/api/admin/wallet-runtime", { method: "PATCH", auth: "admin", body: patch });
  },
  async test(): Promise<WalletRuntimeStatus> {
    requireBackend();
    return apiFetch("/api/admin/wallet-runtime/test", { method: "POST", auth: "admin" });
  },
};