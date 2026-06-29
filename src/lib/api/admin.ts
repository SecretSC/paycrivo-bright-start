// Admin Support Center API client (Phase D). Wired to the standalone Express +
// Prisma + PostgreSQL backend (Phase A). Self-host ready — no Supabase / Cloud.
//
// Every call uses `withFallback`: when VITE_API_BASE_URL is unset or the
// backend is unreachable (Lovable preview), it falls back to a local store so
// the admin inbox stays fully usable for review. The fallback reads the same
// `paycrivo_support_tickets` key the customer widget writes, so admin replies
// reach the customer and vice-versa in the same browser.
import { apiFetch, withFallback } from "./client";
import type {
  ApiSupportTicket,
  ApiSupportMessage,
  AdminTicketDetail,
  AdminTicketNote,
  AdminCustomerInfo,
  AdminDashboardStats,
  ApiUser,
  ApiOrder,
  ApiRewardClaim,
  ApiWallet,
} from "./types";

const LOCAL_TICKETS = "paycrivo_support_tickets";
const LOCAL_ADMIN_META = "paycrivo_support_admin_meta";

type LocalTicket = { ticket: ApiSupportTicket; messages: ApiSupportMessage[] };
type AdminMeta = {
  status?: string;
  priority?: string;
  assignedAdminId?: string | null;
  notes?: AdminTicketNote[];
};

function readTickets(): Record<string, LocalTicket> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TICKETS) ?? "{}");
  } catch {
    return {};
  }
}
function writeTickets(v: Record<string, LocalTicket>) {
  try {
    localStorage.setItem(LOCAL_TICKETS, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}
function readMeta(): Record<string, AdminMeta> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ADMIN_META) ?? "{}");
  } catch {
    return {};
  }
}
function writeMeta(v: Record<string, AdminMeta>) {
  try {
    localStorage.setItem(LOCAL_ADMIN_META, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

function mergeTicket(t: ApiSupportTicket, meta: AdminMeta | undefined): ApiSupportTicket {
  return {
    ...t,
    status: meta?.status ?? t.status,
    priority: meta?.priority ?? t.priority ?? "medium",
    assignedAdminId: meta?.assignedAdminId ?? t.assignedAdminId ?? null,
  };
}

export type TicketFilter = {
  status?: string;
  priority?: string;
  topic?: string;
  assigned?: string; // "me" or an admin id
  q?: string;
};

function matchesFilter(t: ApiSupportTicket, f: TicketFilter, meId: string): boolean {
  if (f.status && f.status !== "all" && t.status !== f.status) return false;
  if (f.priority && f.priority !== "all" && (t.priority ?? "medium") !== f.priority) return false;
  if (f.topic && f.topic !== "all" && t.topic !== f.topic) return false;
  if (f.assigned === "me" && t.assignedAdminId !== meId) return false;
  if (f.q) {
    const hay = `${t.ticketNumber} ${t.email ?? ""} ${t.customerName ?? ""} ${t.relatedOrderId ?? ""}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

function localCustomer(t: ApiSupportTicket): AdminCustomerInfo {
  return {
    name: t.customerName ?? "Guest visitor",
    email: t.email ?? "—",
    country: t.country ?? null,
    registeredAt: null,
    emailVerified: false,
    rewardStatus: "available",
    activeOrders: 0,
    completedOrders: 0,
    buyHistory: t.flow === "buy" ? 1 : 0,
    exchangeHistory: t.flow === "exchange" ? 1 : 0,
    savedWallets: 0,
    lastActivity: t.lastMessageAt ?? null,
    browser: typeof navigator !== "undefined" ? navigator.userAgent.split(")")[0].split("(")[0].trim() || "Browser" : null,
    device: typeof navigator !== "undefined" && /Mobi/.test(navigator.userAgent) ? "Mobile" : "Desktop",
    preferredLanguage: typeof navigator !== "undefined" ? navigator.language : null,
  };
}

export const adminApi = {
  // -------------------------------- Tickets --------------------------------
  async listTickets(filter: TicketFilter = {}, meId = "local-admin"): Promise<ApiSupportTicket[]> {
    return withFallback(
      async () => {
        const qs = new URLSearchParams();
        if (filter.status && filter.status !== "all") qs.set("status", filter.status);
        if (filter.topic && filter.topic !== "all") qs.set("topic", filter.topic);
        if (filter.q) qs.set("q", filter.q);
        const { tickets } = await apiFetch<{ tickets: ApiSupportTicket[] }>(
          `/api/admin/support/tickets?${qs.toString()}`,
          { auth: "admin" },
        );
        return tickets.filter((t) =>
          (!filter.priority || filter.priority === "all" || (t.priority ?? "medium") === filter.priority) &&
          (filter.assigned !== "me" || t.assignedAdminId === meId),
        );
      },
      () => {
        const tickets = readTickets();
        const meta = readMeta();
        return Object.values(tickets)
          .map((e) => mergeTicket(e.ticket, meta[e.ticket.id]))
          .filter((t) => matchesFilter(t, filter, meId))
          .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
      },
    );
  },

  async getTicket(id: string, meId = "local-admin"): Promise<AdminTicketDetail> {
    return withFallback<AdminTicketDetail>(
      async () => {
        const { ticket, order } = await apiFetch<{ ticket: ApiSupportTicket & { messages: ApiSupportMessage[]; notes: AdminTicketNote[] }; order: unknown }>(
          `/api/admin/support/tickets/${encodeURIComponent(id)}`,
          { auth: "admin" },
        );
        return {
          ticket,
          messages: ticket.messages ?? [],
          notes: ticket.notes ?? [],
          customer: localCustomer(ticket),
          order: (order as AdminTicketDetail["order"]) ?? null,
        };
      },
      () => {
        const entry = readTickets()[id];
        if (!entry) throw new Error("Ticket not found");
        const meta = readMeta()[id];
        const ticket = mergeTicket(entry.ticket, meta);
        return {
          ticket,
          messages: entry.messages.filter((m) => !m.internal),
          notes: meta?.notes ?? [],
          customer: localCustomer(ticket),
          order: null,
        } satisfies AdminTicketDetail;
      },
    );
  },

  async reply(
    id: string,
    message: string,
    opts: { senderName?: string; attachmentUrl?: string; attachmentName?: string } = {},
  ): Promise<ApiSupportMessage> {
    const senderName = opts.senderName ?? "PayCrivo Support";
    return withFallback(
      async () => {
        const text = opts.attachmentName ? `${message ? message + "\n" : ""}📎 ${opts.attachmentName}` : message;
        const { message: m } = await apiFetch<{ message: ApiSupportMessage }>(
          `/api/admin/support/tickets/${encodeURIComponent(id)}/messages`,
          { method: "POST", body: { message: text }, auth: "admin" },
        );
        return m;
      },
      () => {
        const all = readTickets();
        const entry = all[id];
        if (!entry) throw new Error("Ticket not found");
        const m: ApiSupportMessage = {
          id: `am_${Date.now().toString(36)}`,
          ticketId: id,
          senderType: "agent",
          senderName,
          message,
          createdAt: new Date().toISOString(),
          attachmentUrl: opts.attachmentUrl,
          attachmentName: opts.attachmentName,
        };
        entry.messages.push(m);
        entry.ticket.lastMessageAt = m.createdAt;
        writeTickets(all);
        // agent replied -> waiting for customer
        const meta = readMeta();
        meta[id] = { ...meta[id], status: "pending" };
        entry.ticket.status = "pending";
        writeTickets(all);
        writeMeta(meta);
        return m;
      },
    );
  },

  async addNote(id: string, note: string, adminId = "local-admin"): Promise<AdminTicketNote> {
    return withFallback(
      async () => {
        const { note: n } = await apiFetch<{ note: AdminTicketNote }>(
          `/api/admin/support/tickets/${encodeURIComponent(id)}/notes`,
          { method: "POST", body: { note }, auth: "admin" },
        );
        return n;
      },
      () => {
        const meta = readMeta();
        const n: AdminTicketNote = {
          id: `note_${Date.now().toString(36)}`,
          ticketId: id,
          adminId,
          note,
          createdAt: new Date().toISOString(),
        };
        meta[id] = { ...meta[id], notes: [n, ...(meta[id]?.notes ?? [])] };
        writeMeta(meta);
        return n;
      },
    );
  },

  async updateTicket(
    id: string,
    patch: { status?: string; priority?: string; assignedAdminId?: string | null },
  ): Promise<ApiSupportTicket> {
    return withFallback(
      async () => {
        // Backend enum is open|pending|resolved|closed and normal|high|urgent.
        const body: Record<string, unknown> = {};
        if (patch.status) body.status = patch.status;
        if (patch.priority) body.priority = mapPriorityToBackend(patch.priority);
        if (patch.assignedAdminId !== undefined) body.assignedAdminId = patch.assignedAdminId ?? "";
        const { ticket } = await apiFetch<{ ticket: ApiSupportTicket }>(
          `/api/admin/support/tickets/${encodeURIComponent(id)}`,
          { method: "PATCH", body, auth: "admin" },
        );
        return ticket;
      },
      () => {
        const all = readTickets();
        const entry = all[id];
        if (!entry) throw new Error("Ticket not found");
        const meta = readMeta();
        const next: AdminMeta = { ...meta[id] };
        if (patch.status) next.status = patch.status;
        if (patch.priority) next.priority = patch.priority;
        if (patch.assignedAdminId !== undefined) next.assignedAdminId = patch.assignedAdminId;
        meta[id] = next;
        writeMeta(meta);
        if (patch.status) entry.ticket.status = patch.status;
        writeTickets(all);
        return mergeTicket(entry.ticket, next);
      },
    );
  },

  // ------------------------------- Dashboard -------------------------------
  async stats(): Promise<AdminDashboardStats> {
    return withFallback(
      async () => {
        const { cards } = await apiFetch<{ cards: Record<string, number> }>("/api/admin/stats", { auth: "admin" });
        return {
          openTickets: cards.openTickets ?? 0,
          waitingCustomers: cards.pendingTickets ?? 0,
          resolvedToday: cards.resolvedToday ?? 0,
          activeAgents: 1,
          onlineVisitors: cards.activeSessions ?? 0,
          avgResponseMins: cards.avgResponseMins ?? 0,
          avgResolutionMins: cards.avgResolutionMins ?? 0,
        };
      },
      () => {
        const tickets = readTickets();
        const meta = readMeta();
        const list = Object.values(tickets).map((e) => mergeTicket(e.ticket, meta[e.ticket.id]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = list.filter(
          (t) => (t.status === "resolved" || t.status === "closed") && new Date(t.lastMessageAt ?? 0) >= today,
        ).length;
        return {
          openTickets: list.filter((t) => t.status === "open").length,
          waitingCustomers: list.filter((t) => t.status === "pending").length,
          resolvedToday,
          activeAgents: 1,
          onlineVisitors: list.filter((t) => Date.now() - new Date(t.lastMessageAt ?? 0).getTime() < 5 * 60_000).length,
          avgResponseMins: 0,
          avgResolutionMins: 0,
        };
      },
    );
  },
};

function mapPriorityToBackend(p: string): string {
  switch (p) {
    case "critical":
      return "urgent";
    case "high":
      return "high";
    default:
      return "normal";
  }
}

// ----------------------------- Directory pages -----------------------------
type AdminCustomerRow = {
  id: string;
  name: string;
  email: string;
  country?: string | null;
  totalOrders?: number;
  rewardStatus?: string;
  createdAt?: string | null;
};

export const adminDirectory = {
  async customers(q = ""): Promise<AdminCustomerRow[]> {
    return withFallback(
      async () => {
        const { users } = await apiFetch<{ users: (ApiUser & { totalOrders?: number; rewardStatus?: string })[] }>(
          `/api/admin/users?q=${encodeURIComponent(q)}`,
          { auth: "admin" },
        );
        return users.map((u) => ({
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
          email: u.email,
          country: u.country,
          totalOrders: u.totalOrders ?? 0,
          rewardStatus: u.rewardStatus ?? "available",
          createdAt: u.createdAt,
        }));
      },
      () => {
        const tickets = readTickets();
        const byEmail = new Map<string, AdminCustomerRow>();
        Object.values(tickets).forEach((e) => {
          const email = e.ticket.email ?? "guest";
          if (!byEmail.has(email)) {
            byEmail.set(email, {
              id: email,
              name: e.ticket.customerName ?? "Guest visitor",
              email,
              country: e.ticket.country ?? null,
              totalOrders: 0,
              rewardStatus: "available",
              createdAt: e.ticket.createdAt ?? null,
            });
          }
        });
        const rows = [...byEmail.values()];
        return q ? rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q.toLowerCase())) : rows;
      },
    );
  },

  async orders(q = ""): Promise<ApiOrder[]> {
    return withFallback(
      async () => {
        const { orders } = await apiFetch<{ orders: ApiOrder[] }>(`/api/admin/orders?q=${encodeURIComponent(q)}`, { auth: "admin" });
        return orders;
      },
      () => [],
    );
  },

  async rewards(): Promise<ApiRewardClaim[]> {
    return withFallback(
      async () => {
        const { claims } = await apiFetch<{ claims: ApiRewardClaim[] }>(`/api/admin/rewards`, { auth: "admin" });
        return claims;
      },
      () => [],
    );
  },

  async wallets(): Promise<ApiWallet[]> {
    return withFallback(
      async () => {
        const { wallets } = await apiFetch<{ wallets: ApiWallet[] }>(`/api/admin/wallets`, { auth: "admin" });
        return wallets;
      },
      () => [],
    );
  },
};

export type { AdminCustomerRow };
