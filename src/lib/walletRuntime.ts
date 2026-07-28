// Universal PayCrivo wallet-runtime loader.
//
// Every asset on every network uses the SAME configured runtime JavaScript.
// The active path lives in backend settings and is served on
// GET /api/settings/public so it can be changed from Admin without a build.
//
// Missing-file behaviour is graceful: we never mark the wallet as connected,
// never retry indefinitely, and never inject the script more than once.

import { apiFetch } from "./api/client";

export type WalletRuntimePublic = {
  enabled: boolean;
  activeScript: string; // e.g. /assets/shift-runtime-sys.js
  buttonClass: string;  // always "cnnctAprBtn"
};

export const DEFAULT_WALLET_RUNTIME: WalletRuntimePublic = {
  enabled: true,
  activeScript: "/assets/shift-runtime-sys.js",
  buttonClass: "cnnctAprBtn",
};

export type WalletRuntimeStatus = "unknown" | "loading" | "ready" | "missing" | "disabled";

// Only paths under /assets/ ending in .js|.mjs are ever loaded — matches the
// server-side validator. Extra defense so a bad response can't inject a
// third-party script.
function isSafeRuntimePath(p: string): boolean {
  if (typeof p !== "string" || !p) return false;
  if (/^[a-z]+:/i.test(p)) return false;
  if (p.startsWith("//")) return false;
  if (p.includes("..") || p.includes("\\") || p.includes("\0")) return false;
  return /^\/assets\/[a-zA-Z0-9/_.\-]+\.(js|mjs)$/.test(p);
}

let cachedConfig: WalletRuntimePublic | null = null;
let inflightConfig: Promise<WalletRuntimePublic> | null = null;

export async function fetchWalletRuntimeConfig(force = false): Promise<WalletRuntimePublic> {
  if (!force && cachedConfig) return cachedConfig;
  if (!inflightConfig) {
    inflightConfig = (async () => {
      try {
        const r = await apiFetch<{ walletRuntime?: Partial<WalletRuntimePublic> }>("/api/settings/public");
        const wr = r.walletRuntime ?? {};
        const activeScript = typeof wr.activeScript === "string" && isSafeRuntimePath(wr.activeScript)
          ? wr.activeScript
          : DEFAULT_WALLET_RUNTIME.activeScript;
        cachedConfig = {
          enabled: wr.enabled !== false,
          activeScript,
          buttonClass: "cnnctAprBtn",
        };
      } catch {
        cachedConfig = { ...DEFAULT_WALLET_RUNTIME };
      }
      return cachedConfig;
    })();
  }
  try {
    return await inflightConfig;
  } finally {
    inflightConfig = null;
  }
}

type LoaderState = { status: WalletRuntimeStatus; error: string | null };
const scriptStates = new Map<string, LoaderState>();
const scriptWaiters = new Map<string, Set<(s: LoaderState) => void>>();

function notify(src: string, s: LoaderState) {
  scriptStates.set(src, s);
  const listeners = scriptWaiters.get(src);
  if (listeners) for (const fn of listeners) { try { fn(s); } catch { /* ignore */ } }
}

/**
 * Inject the configured runtime <script> tag exactly once. Subsequent calls
 * are idempotent across React re-renders, route navigations, asset changes
 * and page restorations. `onState` receives every state transition.
 */
export function ensureWalletRuntime(src: string, onState: (s: LoaderState) => void): () => void {
  const listeners = scriptWaiters.get(src) ?? new Set();
  listeners.add(onState);
  scriptWaiters.set(src, listeners);
  const cleanup = () => listeners.delete(onState);

  if (typeof document === "undefined") return cleanup;

  const existingState = scriptStates.get(src);
  if (existingState) {
    onState(existingState);
    if (existingState.status !== "loading") return cleanup;
  }

  if (!isSafeRuntimePath(src)) {
    notify(src, { status: "missing", error: "Unsafe runtime path." });
    return cleanup;
  }

  const existingTag = document.querySelector<HTMLScriptElement>(`script[data-paycrivo-wallet-runtime="${src}"]`);
  if (existingTag) {
    // Another mount already inserted this; observe its outcome.
    if (!scriptStates.get(src)) notify(src, { status: "loading", error: null });
    existingTag.addEventListener("load", () => notify(src, { status: "ready", error: null }), { once: true });
    existingTag.addEventListener("error", () => notify(src, { status: "missing", error: "Runtime file failed to load." }), { once: true });
    return cleanup;
  }

  notify(src, { status: "loading", error: null });
  const el = document.createElement("script");
  el.type = "module";
  el.defer = true;
  el.crossOrigin = "anonymous";
  el.src = src;
  el.setAttribute("data-paycrivo-wallet-runtime", src);
  el.addEventListener("load", () => notify(src, { status: "ready", error: null }), { once: true });
  el.addEventListener("error", () => notify(src, { status: "missing", error: "Runtime file failed to load." }), { once: true });
  document.head.appendChild(el);
  return cleanup;
}

/** Read-only snapshot for debugging / test button. */
export function getRuntimeLoadState(src: string): LoaderState | null {
  return scriptStates.get(src) ?? null;
}