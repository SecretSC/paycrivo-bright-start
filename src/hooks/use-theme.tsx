import { useEffect, useState } from "react";
import { fetchPublicDefaultTheme, DEFAULT_THEME_CACHE_KEY } from "@/lib/api/settings";

type Theme = "light" | "dark";

// User's explicit choice (highest priority, persisted forever once set).
const USER_KEY = "paycrivo-theme";
// Admin-configured default for visitors with no explicit choice yet.
const DEFAULT_KEY = DEFAULT_THEME_CACHE_KEY;

function read(key: string): Theme | null {
  try {
    const v = localStorage.getItem(key);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** saved user pref > cached admin default > light fallback. */
function resolveInitial(): Theme {
  return read(USER_KEY) ?? read(DEFAULT_KEY) ?? "light";
}

// --- Shared store so every useTheme() instance stays in sync ---------------
let current: Theme = "light";
let hydrated = false;
let fetchedDefault = false;
const listeners = new Set<(t: Theme) => void>();

function apply(theme: Theme) {
  current = theme;
  try {
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(theme));
}

function hydrateOnce() {
  if (hydrated) return;
  hydrated = true;
  apply(resolveInitial());

  // Refresh the admin default in the background. Only override the active theme
  // when the visitor has made no explicit choice yet.
  if (!fetchedDefault) {
    fetchedDefault = true;
    fetchPublicDefaultTheme()
      .then((def) => {
        try {
          localStorage.setItem(DEFAULT_KEY, def);
        } catch {
          /* ignore */
        }
        if (read(USER_KEY) == null) apply(def);
      })
      .catch(() => {
        /* offline: keep current */
      });
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(current);

  useEffect(() => {
    const listener = (t: Theme) => setTheme(t);
    listeners.add(listener);
    hydrateOnce();
    setTheme(current);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = () => {
    const next: Theme = current === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(USER_KEY, next);
    } catch {
      /* ignore */
    }
    apply(next);
  };

  return { theme, toggle };
}
