// Admin authentication context for the Support Center (Phase D).
// Backend: POST /api/admin/login (JWT). Preview fallback: local agent session
// so the inbox can be reviewed without the standalone backend running.
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { adminAuthApi } from "./api/auth";
import { isBackendConfigured, tokenStore } from "./api/client";
import type { ApiAdmin } from "./api/types";

const LOCAL_ADMIN = "paycrivo_admin_local";
const LOCAL_TOKEN = "preview-admin-session";

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
    // Preview fallback agent session.
    const a: ApiAdmin = {
      id: "local-admin",
      email: email.toLowerCase(),
      name: email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Support Agent",
      role: "support_agent",
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
