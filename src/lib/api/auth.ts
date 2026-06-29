// Customer + admin auth wired to the backend. Persists only the JWT bearer
// token (not user records). When no backend is configured, callers fall back
// to the localStorage prototype provider (see src/lib/auth.tsx).
import { apiFetch, tokenStore, isBackendConfigured } from "./client";
import type { ApiUser, ApiAdmin } from "./types";

export const authApi = {
  configured: isBackendConfigured,

  async signup(input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    phone?: string;
    preferredFiat?: string;
  }): Promise<ApiUser> {
    const { token, user } = await apiFetch<{ token: string; user: ApiUser }>("/api/auth/signup", {
      method: "POST",
      body: input,
    });
    tokenStore.setCustomer(token);
    return user;
  },

  async login(email: string, password: string): Promise<ApiUser> {
    const { token, user } = await apiFetch<{ token: string; user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.setCustomer(token);
    return user;
  },

  async me(): Promise<ApiUser | null> {
    if (!tokenStore.getCustomer()) return null;
    try {
      const { user } = await apiFetch<{ user: ApiUser }>("/api/auth/me", { auth: "customer" });
      return user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch("/api/auth/logout", { method: "POST", auth: "customer" });
    } catch {
      /* ignore */
    }
    tokenStore.setCustomer(null);
  },
};

export const adminAuthApi = {
  configured: isBackendConfigured,

  async login(email: string, password: string): Promise<ApiAdmin> {
    const { token, admin } = await apiFetch<{ token: string; admin: ApiAdmin }>("/api/admin/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.setAdmin(token);
    return admin;
  },

  async me(): Promise<ApiAdmin | null> {
    if (!tokenStore.getAdmin()) return null;
    try {
      const { admin } = await apiFetch<{ admin: ApiAdmin }>("/api/admin/me", { auth: "admin" });
      return admin;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiFetch("/api/admin/logout", { method: "POST", auth: "admin" });
    } catch {
      /* ignore */
    }
    tokenStore.setAdmin(null);
  },
};
