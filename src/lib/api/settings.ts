// Website settings API (standalone Express + Prisma backend) with graceful
// preview/offline fallback. The admin-selected default theme is mirrored into
// the `paycrivo-default-theme` localStorage key so the no-flash boot script and
// useTheme can read it synchronously on the next visit.
import { apiFetch, withFallback } from "./client";

export type DefaultTheme = "light" | "dark";

// Shared with the inline no-flash script in __root.tsx and useTheme.
export const DEFAULT_THEME_CACHE_KEY = "paycrivo-default-theme";

function normalize(v: unknown): DefaultTheme {
  return v === "dark" ? "dark" : v === "light" ? "light" : "light";
}

function readCachedDefault(): DefaultTheme {
  try {
    return normalize(localStorage.getItem(DEFAULT_THEME_CACHE_KEY));
  } catch {
    return "light";
  }
}

function writeCachedDefault(theme: DefaultTheme) {
  try {
    localStorage.setItem(DEFAULT_THEME_CACHE_KEY, theme);
  } catch {
    /* ignore */
  }
}

type GeneralSettings = Record<string, unknown> & { defaultTheme?: string };
type StoredSettings = Record<string, unknown> & { general?: GeneralSettings };

/**
 * Public default theme for first-time visitors. Falls back to the cached value
 * (or light) when the backend is unconfigured/unreachable.
 */
export async function fetchPublicDefaultTheme(): Promise<DefaultTheme> {
  return withFallback(
    async () => {
      const { defaultTheme } = await apiFetch<{ defaultTheme: DefaultTheme }>("/api/settings/public");
      return normalize(defaultTheme);
    },
    () => readCachedDefault(),
  );
}

/** Admin: read the currently saved default theme. */
export async function getAdminDefaultTheme(): Promise<DefaultTheme> {
  return withFallback(
    async () => {
      const { settings } = await apiFetch<{ settings: StoredSettings }>("/api/admin/settings", {
        auth: "admin",
      });
      return normalize(settings?.general?.defaultTheme);
    },
    () => readCachedDefault(),
  );
}

/**
 * Admin: persist the default theme. Keeps the rest of the `general` settings
 * intact, mirrors the value into the local cache, and audit-logs server-side.
 */
export async function setAdminDefaultTheme(theme: DefaultTheme): Promise<void> {
  await withFallback(
    async () => {
      const { settings } = await apiFetch<{ settings: StoredSettings }>("/api/admin/settings", {
        auth: "admin",
      });
      const general: GeneralSettings = { ...(settings?.general ?? {}), defaultTheme: theme };
      await apiFetch("/api/admin/settings", {
        method: "PATCH",
        body: { settings: { general } },
        auth: "admin",
      });
    },
    () => {
      /* preview/offline: cache-only persistence below */
    },
  );
  writeCachedDefault(theme);
}
