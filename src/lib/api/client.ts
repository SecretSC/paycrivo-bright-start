// Transport-agnostic HTTP client for the standalone PayCrivo backend
// (Express + Prisma + PostgreSQL in /server). Self-host ready — the base URL
// is driven entirely by VITE_API_BASE_URL. No Supabase / Lovable Cloud.
//
// Graceful fallback: in the Lovable preview the backend is not reachable, so
// callers can ask `isBackendConfigured()` / await `isBackendReachable()` and
// fall back to local mock implementations. Real persistence ALWAYS goes
// through these backend APIs — never localStorage.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
// Normalize: strip a single trailing slash.
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

/** True when a backend base URL is configured at build time. */
export function isBackendConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

// ----------------------------- Token storage -----------------------------
// JWTs only (not user data). Persisting the bearer token is acceptable; it is
// not a "real persistence" data store. Theme/drafts/UI state stay local too.
const CUSTOMER_TOKEN_KEY = "paycrivo_api_token";
const ADMIN_TOKEN_KEY = "paycrivo_admin_api_token";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const tokenStore = {
  getCustomer: () => safeGet(CUSTOMER_TOKEN_KEY),
  setCustomer: (t: string | null) => safeSet(CUSTOMER_TOKEN_KEY, t),
  getAdmin: () => safeGet(ADMIN_TOKEN_KEY),
  setAdmin: (t: string | null) => safeSet(ADMIN_TOKEN_KEY, t),
};

// ----------------------------- Error type --------------------------------
export class ApiError extends Error {
  status: number;
  payload: unknown;
  /** True for connectivity failures (offline / backend down) vs HTTP errors. */
  isNetwork: boolean;
  constructor(message: string, opts: { status?: number; payload?: unknown; isNetwork?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.payload = opts.payload;
    this.isNetwork = opts.isNetwork ?? false;
  }
}

export type Auth = "none" | "customer" | "admin";

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: Auth;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function authHeader(auth: Auth): Record<string, string> {
  if (auth === "customer") {
    const t = tokenStore.getCustomer();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  if (auth === "admin") {
    const t = tokenStore.getAdmin();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }
  return {};
}

/**
 * Core fetch wrapper. Throws ApiError on non-2xx or connectivity failure.
 * `path` should start with "/" (e.g. "/api/auth/login").
 */
export async function apiFetch<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!isBackendConfigured()) {
    throw new ApiError("Backend not configured", { isNetwork: true });
  }
  const { method = "GET", body, auth = "none", signal, timeoutMs = 12_000 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...authHeader(auth),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new ApiError(e instanceof Error ? e.message : "Network error", { isNetwork: true });
  }
  clearTimeout(timer);

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string"
        ? (data as Record<string, string>).error
        : `Request failed (${res.status})`) as string;
    throw new ApiError(msg, { status: res.status, payload: data });
  }
  return data as T;
}

// ----------------------------- Health check ------------------------------
let healthCache: { ok: boolean; checkedAt: number } | null = null;
const HEALTH_TTL_MS = 30_000;

/** Cached reachability probe against GET {BASE}/health. */
export async function isBackendReachable(force = false): Promise<boolean> {
  if (!isBackendConfigured()) return false;
  const now = Date.now();
  if (!force && healthCache && now - healthCache.checkedAt < HEALTH_TTL_MS) {
    return healthCache.ok;
  }
  try {
    await apiFetch("/health", { timeoutMs: 4000 });
    healthCache = { ok: true, checkedAt: now };
    return true;
  } catch {
    healthCache = { ok: false, checkedAt: now };
    return false;
  }
}

/**
 * Run `remote` when the backend is configured AND reachable; otherwise run the
 * local `mock` fallback (preview / offline). Network failures fall back too.
 */
export async function withFallback<T>(remote: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  if (!isBackendConfigured()) return mock();
  try {
    return await remote();
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) {
      healthCache = { ok: false, checkedAt: Date.now() };
      return mock();
    }
    throw e;
  }
}
