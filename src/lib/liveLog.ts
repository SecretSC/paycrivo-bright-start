// Lightweight, privacy-safe live activity log used by the Admin Live Operations
// dashboard. Records ONLY non-sensitive metadata (page, flow, step, coarse
// device/browser) plus a capped ring buffer of safe events. Never stores
// passwords, OTP codes, seed phrases, private keys, or full card data.
//
// When the standalone backend is connected, the admin dashboard reads from it
// directly; this local log keeps the dashboard fully functional otherwise and
// reflects genuine activity happening in the current browser session.
import type { LiveVisitor, LiveOpsEvent, LiveOpsEventType, LiveVisitorStatus } from "./api/types";
import { getAnonId } from "./api/live";

const SESSIONS_KEY = "paycrivo_live_sessions";
const EVENTS_KEY = "paycrivo_live_events";
const MAX_EVENTS = 120;
const IDLE_MS = 90_000;
const ABANDON_MS = 15 * 60_000;

type StoredSession = Omit<LiveVisitor, "status"> & { startedAt: string; completed?: boolean };

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "Unknown";
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "Mobile" : /iPad|Tablet/i.test(navigator.userAgent) ? "Tablet" : "Desktop";
}
function detectBrowser(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

export type HeartbeatInput = {
  currentPage: string;
  flow: LiveVisitor["flow"];
  step?: string | null;
  selectedAsset?: string | null;
  selectedFiat?: string | null;
  email?: string | null;
};

/** Update the current browser's live session record (called on navigation). */
export function recordHeartbeat(input: HeartbeatInput) {
  const id = getAnonId();
  const sessions = read<Record<string, StoredSession>>(SESSIONS_KEY, {});
  const now = new Date().toISOString();
  const prev = sessions[id];
  sessions[id] = {
    sessionId: id,
    startedAt: prev?.startedAt ?? now,
    currentPage: input.currentPage,
    flow: input.flow,
    step: input.step ?? null,
    selectedAsset: input.selectedAsset ?? prev?.selectedAsset ?? null,
    selectedFiat: input.selectedFiat ?? prev?.selectedFiat ?? null,
    email: input.email ?? prev?.email ?? null,
    lastActivity: now,
    device: detectDevice(),
    browser: detectBrowser(),
    needsHelp: prev?.needsHelp,
    completed: prev?.completed,
  };
  write(SESSIONS_KEY, sessions);
}

export function markCompleted() {
  const id = getAnonId();
  const sessions = read<Record<string, StoredSession>>(SESSIONS_KEY, {});
  if (sessions[id]) {
    sessions[id].completed = true;
    sessions[id].lastActivity = new Date().toISOString();
    write(SESSIONS_KEY, sessions);
  }
}

export function setNeedsHelp(sessionId: string, needsHelp = true) {
  const sessions = read<Record<string, StoredSession>>(SESSIONS_KEY, {});
  if (sessions[sessionId]) {
    sessions[sessionId].needsHelp = needsHelp;
    write(SESSIONS_KEY, sessions);
  }
}

function statusFor(s: StoredSession): LiveVisitorStatus {
  if (s.completed) return "completed";
  const age = Date.now() - new Date(s.lastActivity).getTime();
  if (age > ABANDON_MS) return "abandoned";
  if (age > IDLE_MS) return "idle";
  return "active";
}

export function readVisitors(): LiveVisitor[] {
  const sessions = read<Record<string, StoredSession>>(SESSIONS_KEY, {});
  return Object.values(sessions)
    .map((s) => ({ ...s, status: statusFor(s) }))
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

const EVENT_LABELS: Record<LiveOpsEventType, string> = {
  page_view: "Page viewed",
  checkout_started: "Checkout started",
  email_entered: "Email entered",
  email_verified: "Email verified",
  wallet_step: "Wallet step reached",
  wallet_validation_failed: "Wallet validation failed",
  ownership_confirmed: "Ownership confirmed",
  order_created: "Order created",
  support_opened: "Support opened",
  ticket_created: "Ticket created",
  otp_failed: "OTP verification failed",
  reward_claim: "Reward claim submitted",
  nav_suggestion: "Navigation suggestion sent",
};

export function recordEvent(
  type: LiveOpsEventType,
  extra?: { email?: string | null; label?: string },
) {
  const events = read<LiveOpsEvent[]>(EVENTS_KEY, []);
  events.unshift({
    id: `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    label: extra?.label ?? EVENT_LABELS[type],
    sessionId: getAnonId(),
    email: extra?.email ?? null,
    createdAt: new Date().toISOString(),
  });
  write(EVENTS_KEY, events.slice(0, MAX_EVENTS));
}

export function readEvents(): LiveOpsEvent[] {
  return read<LiveOpsEvent[]>(EVENTS_KEY, []);
}
