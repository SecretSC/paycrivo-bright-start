// Privacy-safe live activity tracker. Records page views and coarse checkout
// progress to the local live log (and the backend, when configured) so the
// Admin Live Operations dashboard reflects genuine activity. Never records
// passwords, OTP codes, seed phrases, private keys, or full card data.
import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { loadDraft } from "@/lib/checkout";
import { loadExchangeDraft } from "@/lib/exchange";
import { useAuth } from "@/lib/auth";
import { recordHeartbeat, recordEvent, markCompleted } from "@/lib/liveLog";
import type { LiveVisitor } from "@/lib/api/types";

const BUY_STEPS = ["Amount", "Email", "Your details", "Wallet", "Wallet ownership", "Review"];
const EXCHANGE_STEPS = ["Pair", "Email", "Wallet", "Wallet ownership", "Send crypto", "Review"];

export function LiveTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const lastPath = useRef<string | null>(null);
  const lastStepKey = useRef<string | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return; // don't track the admin area itself

    let flow: LiveVisitor["flow"] = "browsing";
    let step: string | null = null;
    let selectedAsset: string | null = null;
    let selectedFiat: string | null = null;

    if (pathname.startsWith("/buy")) {
      flow = "buy";
      const d = loadDraft();
      if (d) {
        step = BUY_STEPS[d.step] ?? String(d.step);
        selectedAsset = d.coin ?? null;
        selectedFiat = d.fiat ?? null;
      }
    } else if (pathname.startsWith("/exchange")) {
      flow = "exchange";
      const d = loadExchangeDraft();
      if (d) {
        step = EXCHANGE_STEPS[d.step] ?? String(d.step);
        selectedAsset = d.sendCoin ?? null;
      }
    } else if (pathname.startsWith("/account/reward")) {
      flow = "reward";
    } else if (pathname.startsWith("/account") || pathname.startsWith("/dashboard")) {
      flow = "account";
    }

    const email = user?.email ?? null;
    recordHeartbeat({ currentPage: pathname, flow, step, selectedAsset, selectedFiat, email });

    // Page view (once per distinct path).
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      recordEvent("page_view", { email, label: `Page viewed: ${pathname}` });
      if ((flow === "buy" || flow === "exchange") && (!step || step === BUY_STEPS[0] || step === EXCHANGE_STEPS[0])) {
        recordEvent("checkout_started", { email, label: `${flow === "buy" ? "Buy" : "Exchange"} checkout started` });
      }
      if (/\/order\//.test(pathname) || /success/i.test(pathname)) markCompleted();
    }

    // Step-derived safe milestones.
    if (step) {
      const key = `${flow}:${step}`;
      if (lastStepKey.current !== key) {
        lastStepKey.current = key;
        if (step === "Wallet") recordEvent("wallet_step", { email });
        else if (step === "Wallet ownership") recordEvent("wallet_step", { email, label: "Wallet ownership step reached" });
        else if (step === "Email") recordEvent("email_entered", { email, label: "Reached email step" });
      }
    }
  }, [pathname, user]);

  return null;
}
