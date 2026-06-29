// Support tickets + messages wired to the backend. Used by the support chat
// widget (Phase C). Preview fallback keeps a local conversation so the widget
// remains usable without a backend.
import { apiFetch, withFallback } from "./client";
import type { ApiSupportTicket, ApiSupportMessage } from "./types";

const LOCAL_TICKETS = "paycrivo_support_tickets";

type CreateTicketInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  topic: "purchase" | "exchange" | "wallet" | "account" | "reward" | "other";
  message: string;
  currentPage?: string;
  flow?: string;
  step?: string;
  relatedOrderId?: string;
  sessionId?: string;
};

type LocalTicket = {
  ticket: ApiSupportTicket;
  messages: ApiSupportMessage[];
};

function readLocal(): Record<string, LocalTicket> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_TICKETS) ?? "{}");
  } catch {
    return {};
  }
}
function writeLocal(v: Record<string, LocalTicket>) {
  try {
    localStorage.setItem(LOCAL_TICKETS, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export const supportApi = {
  async createTicket(input: CreateTicketInput): Promise<{ ticket: ApiSupportTicket; messages: ApiSupportMessage[] }> {
    return withFallback(
      async () => {
        const { ticket } = await apiFetch<{ ticket: ApiSupportTicket & { messages: ApiSupportMessage[] } }>(
          "/api/support/tickets",
          { method: "POST", body: input },
        );
        return { ticket, messages: ticket.messages ?? [] };
      },
      () => {
        const id = `tkt_${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const entry: LocalTicket = {
          ticket: { id, ticketNumber: id.toUpperCase(), status: "open", topic: input.topic, lastMessageAt: now },
          messages: [
            { id: `m1_${id}`, ticketId: id, senderType: "customer", message: input.message, createdAt: now },
            {
              id: `m2_${id}`,
              ticketId: id,
              senderType: "system",
              message: "Thanks. A PayCrivo support agent will reply here.",
              createdAt: now,
            },
          ],
        };
        const all = readLocal();
        all[id] = entry;
        writeLocal(all);
        return { ticket: entry.ticket, messages: entry.messages };
      },
    );
  },

  async getMessages(ticketId: string): Promise<{ ticket: ApiSupportTicket; messages: ApiSupportMessage[] }> {
    return withFallback(
      async () => {
        return apiFetch<{ ticket: ApiSupportTicket; messages: ApiSupportMessage[] }>(
          `/api/support/tickets/${encodeURIComponent(ticketId)}/messages`,
        );
      },
      () => {
        const entry = readLocal()[ticketId];
        if (!entry) throw new Error("Ticket not found");
        return entry;
      },
    );
  },

  async sendMessage(ticketId: string, message: string): Promise<ApiSupportMessage> {
    return withFallback(
      async () => {
        const { message: m } = await apiFetch<{ message: ApiSupportMessage }>(
          `/api/support/tickets/${encodeURIComponent(ticketId)}/messages`,
          { method: "POST", body: { message } },
        );
        return m;
      },
      () => {
        const all = readLocal();
        const entry = all[ticketId];
        if (!entry) throw new Error("Ticket not found");
        const m: ApiSupportMessage = {
          id: `m_${Date.now().toString(36)}`,
          ticketId,
          senderType: "customer",
          message,
          createdAt: new Date().toISOString(),
        };
        entry.messages.push(m);
        entry.ticket.lastMessageAt = m.createdAt;
        writeLocal(all);
        return m;
      },
    );
  },
};
