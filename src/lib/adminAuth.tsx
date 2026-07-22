// Admin authentication context for the Support Center (Phase D).
// Backend: POST /api/admin/login (JWT). Preview fallback: local agent session
// so the inbox can be reviewed without the standalone backend running.
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { adminAuthApi } from "./api/auth";
import { isBackendConfigured, tokenStore } from "./api/client";
import type { ApiAdmin } from "./api/types";

const LOCAL_ADMIN = "paycrivo_admin_local";
const LOCAL_TOKEN = "preview-admin-session";
const CREDS_KEY = "paycrivo_admin_credentials";
const DEFAULT_EMAIL = "admin@paycrivo.com";
const DEFAULT_PASSWORD = "Admin@1234";

type StoredCreds = { email: string; password: string };

function readCreds(): StoredCreds {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredCreds>;
      if (parsed?.email && parsed?.password) {
        return { email: parsed.email.toLowerCase(), password: parsed.password };
      }
    }
  } catch { /* ignore */ }
  return { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
}

export function setAdminCredentials(email: string, password: string) {
  try {
    localStorage.setItem(CREDS_KEY, JSON.stringify({ email: email.toLowerCase(), password }));
  } catch { /* ignore */ }
}
export function getAdminCredentialsEmail(): string { return readCreds().email; }

type AdminAuthValue = {
  admin: ApiAdmin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

function readLocalAdmin(): ApiAdmin | null {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN);
    return raw ? (JSON.parse(raw) as ApiAdmin) : null;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<ApiAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (isBackendConfigured()) {
        const me = await adminAuthApi.me();
        if (active) setAdmin(me);
      } else if (tokenStore.getAdmin() === LOCAL_TOKEN) {
        if (active) setAdmin(readLocalAdmin());
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isBackendConfigured()) {
      const a = await adminAuthApi.login(email, password);
      setAdmin(a);
      return;
    }
    // Static hosting: enforce the local admin credentials (default
    // admin@paycrivo.com / Admin@1234, overridable via setAdminCredentials).
    const creds = readCreds();
    if (email.trim().toLowerCase() !== creds.email || password !== creds.password) {
      throw new Error("Invalid email or password.");
    }
    const a: ApiAdmin = {
      id: "local-admin",
      email: creds.email,
      name: "PayCrivo Admin",
      role: "super_admin",
    };
    tokenStore.setAdmin(LOCAL_TOKEN);
    try {
      localStorage.setItem(LOCAL_ADMIN, JSON.stringify(a));
    } catch {
      /* ignore */
    }
    setAdmin(a);
  }, []);

  const logout = useCallback(async () => {
    await adminAuthApi.logout();
    try {
      localStorage.removeItem(LOCAL_ADMIN);
    } catch {
      /* ignore */
    }
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
