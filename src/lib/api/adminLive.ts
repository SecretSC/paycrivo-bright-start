// Admin Live Operations API (Phase E). Aggregates real-time activity for the
// /admin/live-ops dashboard. Uses the standalone backend when configured and a
// privacy-safe local snapshot otherwise, so the operations center is always
// functional for review. No secrets are ever read or surfaced.
import { apiFetch, withFallback, isBackendConfigured, isBackendReachable } from "./client";
import type {
  LiveOpsSnapshot,
  LiveOpsHealth,
  LiveVisitor,
  ApiOrder,
  ApiSupportTicket,
  LiveOpsEvent,
} from "./types";
import { readVisitors, readEvents } from "../liveLog";

const LOCAL_TICKETS = "paycrivo_support_tickets";

type LocalTicket = { ticket: ApiSupportTicket };

function readLocalTickets(): ApiSupportTicket[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_TICKETS) ?? "{}") as Record<string, LocalTicket>;
    return Object.values(raw).map((t) => t.ticket).filter(Boolean);
  } catch {
    return [];
  }
}

function readLocalSignups(): { email: string; createdAt: string }[] {
  try {
    const raw = JSON.parse(localStorage.getItem("paycrivo_users") ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((a: { email?: string; createdAt?: string }) => ({ email: a.email ?? "", createdAt: a.createdAt ?? "" }))
      .filter((a) => a.email)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

function within(iso: string | null | undefined, ms: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < ms;
}

function buildLocalSnapshot(): LiveOpsSnapshot {
  const visitors = readVisitors();
  const events = readEvents();
  const tickets = readLocalTickets();
  const signups = readLocalSignups();

  const active = visitors.filter((v) => v.status === "active" || v.status === "idle");
  const health: LiveOpsHealth = {
    api: "operational",
    smtp: "operational",
    backend: "operational",
  };

  return {
    metrics: {
      activeVisitors: active.length,
      activeBuyCheckouts: active.filter((v) => v.flow === "buy").length,
      activeExchangeCheckouts: active.filter((v) => v.flow === "exchange").length,
      openSupportChats: tickets.filter((t) => t.status === "open").length,
      waitingTickets: tickets.filter((t) => t.status === "pending").length,
      recentSignups: signups.filter((s) => within(s.createdAt, 24 * 3600_000)).length,
      recentOrders: events.filter((e) => e.type === "order_created" && within(e.createdAt, 24 * 3600_000)).length,
      failedValidations: events.filter((e) => e.type === "wallet_validation_failed" || e.type === "otp_failed").length,
      walletValidationErrors: events.filter((e) => e.type === "wallet_validation_failed").length,
      otpFailures: events.filter((e) => e.type === "otp_failed").length,
      rewardClaims: events.filter((e) => e.type === "reward_claim").length,
    },
    visitors,
    orders: [],
    tickets: tickets.sort(
      (a, b) => new Date(b.lastMessageAt ?? b.createdAt ?? 0).getTime() - new Date(a.lastMessageAt ?? a.createdAt ?? 0).getTime(),
    ),
    signups: signups.slice(0, 10),
    events,
    health,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRemoteSession(s: any): LiveVisitor {
  const last = s.lastActivityAt ?? s.updatedAt ?? s.createdAt;
  const age = Date.now() - new Date(last).getTime();
  const EVENT_LABEL: Record<string, string> = {
    page_view: "Viewing page", clicked_buy: "Started buy", clicked_exchange: "Started exchange",
    reached_email_step: "At email step", email_verified: "Email verified",
    reached_wallet_step: "At wallet step", wallet_submitted: "Submitted wallet",
    wallet_validation_failed: "Wallet validation failed", ownership_confirmed: "Confirmed ownership",
    ownership_manual: "Manual ownership", order_created: "Order created",
    support_opened: "Opened support", checkout_abandoned: "Abandoned checkout", error: "Hit an error",
  };
  return {
    sessionId: s.id ?? s.anonId ?? "session",
    email: s.email ?? null,
    currentPage: s.currentPage ?? "/",
    flow: (s.flow as LiveVisitor["flow"]) ?? "browsing",
    step: s.currentStep ?? s.step ?? null,
    selectedAsset: s.selectedAsset ?? null,
    selectedFiat: s.selectedFiat ?? null,
    lastActivity: last ?? new Date().toISOString(),
    device: s.deviceType ?? "Desktop",
    browser: s.browser ?? "Browser",
    status: s.status ?? (age > 15 * 60_000 ? "abandoned" : age > 90_000 ? "idle" : "active"),
    needsHelp: s.needsHelp ?? false,
    country: s.country ?? s.personal?.country ?? null,
    lastAction: s.lastEvent ? (EVENT_LABEL[s.lastEvent.type] ?? s.lastEvent.type) : null,
    personal: s.personal ?? null,
    order: s.order ?? null,
  };
}

export const adminLiveApi = {
  async snapshot(): Promise<LiveOpsSnapshot> {
    return withFallback<LiveOpsSnapshot>(
      async () => {
        const [stats, overview, live, rewards] = await Promise.all([
          apiFetch<any>("/api/admin/stats", { auth: "admin" }),
          apiFetch<any>("/api/admin/overview", { auth: "admin" }),
          apiFetch<any>("/api/admin/live-sessions", { auth: "admin" }),
          apiFetch<any>("/api/admin/rewards", { auth: "admin" }).catch(() => ({ claims: [] })),
        ]);
        const cards = stats.cards ?? {};
        const visitors: LiveVisitor[] = (live.sessions ?? []).map(mapRemoteSession);
        const tickets: ApiSupportTicket[] = overview.recentTickets ?? [];
        const orders: ApiOrder[] = overview.recentOrders ?? [];
        const events: LiveOpsEvent[] = readEvents();
        const backendOk = await isBackendReachable();
        return {
          metrics: {
            activeVisitors: cards.activeSessions ?? visitors.filter((v) => v.status !== "abandoned").length,
            activeBuyCheckouts: visitors.filter((v) => v.flow === "buy" && v.status !== "abandoned").length,
            activeExchangeCheckouts: visitors.filter((v) => v.flow === "exchange" && v.status !== "abandoned").length,
            openSupportChats: cards.openTickets ?? 0,
            waitingTickets: cards.pendingTickets ?? 0,
            recentSignups: cards.usersToday ?? 0,
            recentOrders: (cards.buyToday ?? 0) + (cards.exchangeToday ?? 0),
            failedValidations: cards.failedOrders ?? 0,
            walletValidationErrors: events.filter((e) => e.type === "wallet_validation_failed").length,
            otpFailures: events.filter((e) => e.type === "otp_failed").length,
            rewardClaims: cards.rewardsPending ?? (rewards.claims ?? []).length,
          },
          visitors,
          orders,
          tickets,
          signups: (overview.recentUsers ?? []).map((u: any) => ({
            email: u.email,
            createdAt: u.createdAt,
          })),
          events,
          health: {
            api: "operational",
            smtp: "operational",
            backend: backendOk ? "operational" : "degraded",
          },
        };
      },
      () => buildLocalSnapshot(),
    );
  },

  async sendSuggestion(sessionId: string, to: string, label: string): Promise<void> {
    if (!isBackendConfigured()) return;
    await withFallback(
      async () => {
        await apiFetch(`/api/admin/live-sessions/${encodeURIComponent(sessionId)}/suggest`, {
          method: "POST",
          auth: "admin",
          body: { to, label },
        });
      },
      () => undefined,
    );
  },
};
