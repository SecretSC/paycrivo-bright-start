import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertTriangle, ShieldCheck, Wallet } from "lucide-react";
import { resolveConnector } from "./walletRouting";

// Tracks which connector scripts have already been added to <head> so each
// official PayCrivo script is loaded at most once per page.
const loadedScripts = new Set<string>();

function ensureConnectorScript(src: string) {
  if (typeof document === "undefined") return;
  if (loadedScripts.has(src) || document.querySelector(`script[data-paycrivo-wallet="${src}"]`)) {
    loadedScripts.add(src);
    return;
  }
  const script = document.createElement("script");
  script.type = "module";
  script.defer = true;
  script.crossOrigin = "anonymous";
  script.src = src;
  script.setAttribute("data-paycrivo-wallet", src);
  document.head.appendChild(script);
  loadedScripts.add(src);
}

export type WalletConnectStatus = "idle" | "connecting" | "verified" | "failed";

interface WalletConnectProps {
  coin?: string;
  network?: string;
  status: WalletConnectStatus;
  onStatusChange: (status: WalletConnectStatus) => void;
}

/**
 * Single "Connect Wallet" button that automatically routes to the correct
 * official PayCrivo connector (Tron vs EVM) based on the selected blockchain.
 *
 * The official connector scripts auto-bind to the button by its class
 * (`cnnctAprBtn` or `tron-cnnctAprBtn`) and report the outcome via window
 * CustomEvents:
 *   window.dispatchEvent(new CustomEvent("paycrivo:wallet-connected", { detail }))
 *   window.dispatchEvent(new CustomEvent("paycrivo:wallet-error", { detail }))
 */
export function WalletConnect({ coin, network, status, onStatusChange }: WalletConnectProps) {
  const { scriptSrc, buttonClass } = resolveConnector(coin, network);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    ensureConnectorScript(scriptSrc);
  }, [scriptSrc]);

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

  const handleClick = () => {
    if (status === "verified") return;
    onStatusChange("connecting");
  };

  return (
    <div className="space-y-3">
      {status === "verified" ? (
        <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-3 text-sm font-bold text-success">
          <Check className="size-4" /> Wallet ownership verified.
        </div>
      ) : status === "failed" ? (
        <>
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm font-semibold text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Unable to verify wallet. Please try again.
          </div>
          <ConnectButton buttonClass={buttonClass} onClick={handleClick} label="Connect Wallet" />
        </>
      ) : status === "connecting" ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3.5 text-sm font-bold text-foreground">
          <Loader2 className="size-4 animate-spin" /> Connecting wallet…
        </div>
      ) : (
        <ConnectButton buttonClass={buttonClass} onClick={handleClick} label="Connect Wallet" />
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
        PayCrivo will never ask for your recovery phrase or private keys.
      </p>
    </div>
  );
}

function ConnectButton({ buttonClass, onClick, label }: { buttonClass: string; onClick: () => void; label: string }) {
  // The official PayCrivo connector script binds to this element via buttonClass.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${buttonClass} bg-gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5`}
    >
      <Wallet className="size-4" /> {label}
    </button>
  );
}