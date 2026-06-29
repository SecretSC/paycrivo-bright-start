import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Send, Paperclip, StickyNote, MessageSquareText, ChevronDown, Check, CheckCheck,
  Copy, User, ShoppingCart, Wallet, Gift, ShieldAlert, X, Filter,
} from "lucide-react";
import { adminApi, type TicketFilter } from "@/lib/api/admin";
import { useAdminAuth } from "@/lib/adminAuth";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import type { ApiSupportTicket, ApiSupportMessage, AdminTicketDetail } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS, STATUS_STYLES, PRIORITIES, PRIORITY_LABELS, PRIORITY_STYLES, TOPIC_LABELS,
  CANNED_RESPONSES, redactForDisplay, fmtTime, fmtDateTime, relativeTime, initials,
} from "@/lib/admin-ui";

type Search = {
  status?: string;
  assigned?: string;
  priority?: string;
  topic?: string;
  q?: string;
  ticket?: string;
};

export const Route = createFileRoute("/admin/conversations")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: typeof s.status === "string" ? s.status : "all",
    assigned: typeof s.assigned === "string" ? s.assigned : undefined,
    priority: typeof s.priority === "string" ? s.priority : undefined,
    topic: typeof s.topic === "string" ? s.topic : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
    ticket: typeof s.ticket === "string" ? s.ticket : undefined,
  }),
  component: Conversations,
});

const SECRET_RE = /\b(seed\s?phrase|recovery\s?phrase|mnemonic|private\s?key|secret\s?key|pass\s?word|passphrase)\b/i;

function Conversations() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const meId = admin?.id ?? "local-admin";

  const [query, setQuery] = useState(search.q ?? "");

  const filter: TicketFilter = useMemo(
    () => ({ status: search.status, assigned: search.assigned, priority: search.priority, topic: search.topic, q: search.q }),
    [search.status, search.assigned, search.priority, search.topic, search.q],
  );

  const listFetcher = useCallback(() => adminApi.listTickets(filter, meId), [filter, meId]);
  const { data: tickets } = useRealtimePoll(`admin:list:${JSON.stringify(filter)}`, listFetcher, { intervalMs: 3000 });

  const setSearch = (patch: Partial<Search>) =>
    navigate({ to: "/admin/conversations", search: (prev: Search) => ({ ...prev, ...patch }) });

  const activeId = search.ticket;

  // auto-select first ticket when none selected
  useEffect(() => {
    if (!activeId && tickets && tickets.length > 0) {
      setSearch({ ticket: tickets[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, activeId]);

  return (
    <div className="flex h-full min-h-0">
      {/* LEFT — list */}
      <div className={cn("flex w-full flex-col border-r border-border md:w-80 md:shrink-0", activeId && "hidden md:flex")}>
        <div className="space-y-2 border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch({ q: query || undefined })}
              placeholder="Search ticket, email, name, order…"
              className="pl-8"
            />
          </div>
          <FilterBar search={search} setSearch={setSearch} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {(tickets ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => setSearch({ ticket: t.id })}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/50",
                activeId === t.id && "bg-muted",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                {initials(t.customerName, t.email)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{t.customerName ?? t.email ?? "Guest visitor"}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(t.lastMessageAt)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{TOPIC_LABELS[t.topic] ?? t.topic}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-medium", STATUS_STYLES[t.status])}>
                    {STATUS_LABELS[t.status] ?? t.status}
                  </span>
                  <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-medium", PRIORITY_STYLES[t.priority ?? "medium"])}>
                    {PRIORITY_LABELS[t.priority ?? "medium"]}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {(!tickets || tickets.length === 0) && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No conversations match these filters.</p>
          )}
        </div>
      </div>

      {/* CENTER + RIGHT */}
      {activeId ? (
        <ConversationView
          key={activeId}
          ticketId={activeId}
          meId={meId}
          agentName={admin?.name ?? "PayCrivo Support"}
          onBack={() => setSearch({ ticket: undefined })}
        />
      ) : (
        <div className="hidden flex-1 place-items-center md:grid">
          <div className="text-center text-sm text-muted-foreground">
            <MessageSquareText className="mx-auto mb-2 size-8 opacity-40" />
            Select a conversation to get started.
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBar({ search, setSearch }: { search: Search; setSearch: (p: Partial<Search>) => void }) {
  const chip = (label: string, value: string | undefined, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
        active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted">
            <Filter className="size-3" /> Priority <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setSearch({ priority: undefined })}>All priorities</DropdownMenuItem>
          {PRIORITIES.map((p) => (
            <DropdownMenuItem key={p} onClick={() => setSearch({ priority: p })}>{PRIORITY_LABELS[p]}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted">
            <Filter className="size-3" /> Topic <ChevronDown className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setSearch({ topic: undefined })}>All topics</DropdownMenuItem>
          {Object.entries(TOPIC_LABELS).map(([v, l]) => (
            <DropdownMenuItem key={v} onClick={() => setSearch({ topic: v })}>{l}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {(search.priority || search.topic || search.q || search.assigned === "me") && (
        chip("Clear", undefined, false, () => setSearch({ priority: undefined, topic: undefined, q: undefined }))
      )}
    </div>
  );
}

function ConversationView({
  ticketId, meId, agentName, onBack,
}: {
  ticketId: string;
  meId: string;
  agentName: string;
  onBack: () => void;
}) {
  const fetcher = useCallback(() => adminApi.getTicket(ticketId, meId), [ticketId, meId]);
  const { data: detail, refetch } = useRealtimePoll<AdminTicketDetail>(`admin:ticket:${ticketId}`, fetcher, {
    intervalMs: 2500,
  });

  if (!detail) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ChatPane detail={detail} agentName={agentName} ticketId={ticketId} onRefetch={refetch} onBack={onBack} />
      <CustomerPanel detail={detail} ticketId={ticketId} meId={meId} agentName={agentName} onRefetch={refetch} />
    </div>
  );
}

function ChatPane({
  detail, agentName, ticketId, onRefetch, onBack,
}: {
  detail: AdminTicketDetail;
  agentName: string;
  ticketId: string;
  onRefetch: () => Promise<void>;
  onBack: () => void;
}) {
  const { ticket, messages, notes } = detail;
  const [draft, setDraft] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastCustomerCount = useRef<number>(-1);

  const customerMsgs = messages.filter((m) => m.senderType === "customer");
  const lastCustomerMsg = customerMsgs[customerMsgs.length - 1];
  const waitingOnAgent = lastCustomerMsg && (!messages.length || messages[messages.length - 1].senderType === "customer");

  // new-message sound + desktop notification when a customer message arrives
  useEffect(() => {
    const count = customerMsgs.length;
    if (lastCustomerCount.current === -1) {
      lastCustomerCount.current = count;
      return;
    }
    if (count > lastCustomerCount.current) {
      playPing();
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        new Notification(`New message · ${ticket.customerName ?? ticket.email ?? "Customer"}`, {
          body: redactForDisplay(lastCustomerMsg?.message ?? ""),
        });
      }
    }
    lastCustomerCount.current = count;
  }, [customerMsgs.length, lastCustomerMsg, ticket.customerName, ticket.email]);

  // auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, notes.length, internal]);

  const secretWarning = SECRET_RE.test(draft);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (internal) {
        await adminApi.addNote(ticketId, text);
        setInternal(false);
      } else {
        await adminApi.reply(ticketId, text, { senderName: agentName });
      }
      setDraft("");
      await onRefetch();
    } catch {
      toast.error("Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const onPickFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Files must be under 5MB.");
      return;
    }
    const url = await fileToDataUrl(file);
    try {
      await adminApi.reply(ticketId, "", { senderName: agentName, attachmentUrl: url, attachmentName: file.name });
      await onRefetch();
    } catch {
      toast.error("Upload failed.");
    }
  };

  // Merge notes into the timeline (internal-only display).
  const timeline = useMemo(() => {
    const items: { kind: "msg" | "note"; at: string; data: ApiSupportMessage | { id: string; note: string; createdAt: string } }[] = [
      ...messages.map((m) => ({ kind: "msg" as const, at: m.createdAt, data: m })),
      ...notes.map((n) => ({ kind: "note" as const, at: n.createdAt, data: n })),
    ];
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [messages, notes]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back">
          <X className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{ticket.customerName ?? ticket.email ?? "Guest visitor"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {ticket.ticketNumber} · {TOPIC_LABELS[ticket.topic] ?? ticket.topic}
          </p>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", STATUS_STYLES[ticket.status])}>
          {STATUS_LABELS[ticket.status] ?? ticket.status}
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
        {timeline.map((item) => {
          if (item.kind === "note") {
            const n = item.data as { id: string; note: string; createdAt: string };
            return (
              <div key={n.id} className="mx-auto max-w-[85%] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-500">
                  <StickyNote className="size-3" /> Internal note
                </p>
                <p className="text-sm text-foreground">{n.note}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtTime(n.createdAt)}</p>
              </div>
            );
          }
          const m = item.data as ApiSupportMessage;
          if (m.senderType === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">{m.message}</span>
              </div>
            );
          }
          const mine = m.senderType === "agent";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className="max-w-[78%] space-y-1">
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card text-foreground border border-border",
                  )}
                >
                  {m.attachmentUrl ? (
                    isImage(m.attachmentName) ? (
                      <img src={m.attachmentUrl} alt={m.attachmentName ?? "attachment"} className="max-h-48 rounded-lg" />
                    ) : (
                      <a href={m.attachmentUrl} download={m.attachmentName} className="flex items-center gap-1 underline">
                        <Paperclip className="size-3.5" /> {m.attachmentName}
                      </a>
                    )
                  ) : (
                    <LinkifiedText text={redactForDisplay(m.message)} />
                  )}
                </div>
                <div className={cn("flex items-center gap-1 px-1 text-[10px] text-muted-foreground", mine ? "justify-end" : "justify-start")}>
                  <span>{fmtTime(m.createdAt)}</span>
                  {mine && (customerRepliedAfter(messages, m) ? <CheckCheck className="size-3 text-primary" /> : <Check className="size-3" />)}
                </div>
              </div>
            </div>
          );
        })}
        {waitingOnAgent && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2.5">
              <span className="text-[11px] text-muted-foreground">Customer is waiting</span>
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border p-3">
        {secretWarning && !internal && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>Never request seed phrases, private keys, passwords, or full card details from customers.</span>
          </div>
        )}
        <div className="mb-2 flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <MessageSquareText className="size-3.5" /> Canned
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-w-xs">
              <DropdownMenuLabel>Canned responses</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CANNED_RESPONSES.map((c) => (
                <DropdownMenuItem key={c.label} onClick={() => setDraft((d) => (d ? d + " " : "") + c.text)}>
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-3.5" /> Attach
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.txt,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant={internal ? "default" : "outline"}
            size="sm"
            className={cn("h-7 gap-1 text-xs", internal && "bg-amber-500 text-white hover:bg-amber-500/90")}
            onClick={() => setInternal((v) => !v)}
          >
            <StickyNote className="size-3.5" /> Internal note
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={internal ? "Write an internal note (not visible to customer)…" : "Type a reply…"}
            className={cn("max-h-32 min-h-9 resize-none", internal && "border-amber-500/50 bg-amber-500/5")}
          />
          <Button size="icon" onClick={send} disabled={sending || !draft.trim()} aria-label="Send">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CustomerPanel({
  detail, ticketId, meId, agentName, onRefetch,
}: {
  detail: AdminTicketDetail;
  ticketId: string;
  meId: string;
  agentName: string;
  onRefetch: () => Promise<void>;
}) {
  const { ticket, customer } = detail;
  const [noteDraft, setNoteDraft] = useState("");

  const update = async (patch: { status?: string; priority?: string; assignedAdminId?: string | null }) => {
    try {
      await adminApi.updateTicket(ticketId, patch);
      await onRefetch();
      toast.success("Ticket updated.");
    } catch {
      toast.error("Update failed.");
    }
  };

  const copy = (label: string, value?: string | null) => {
    if (!value || value === "—") return;
    navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied.`)).catch(() => {});
  };

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Email", value: customer.email },
    { label: "Country", value: customer.country ?? "—" },
    { label: "Registered", value: fmtDateTime(customer.registeredAt) },
    { label: "Verification", value: customer.emailVerified ? "Verified" : "Unverified" },
    { label: "Reward status", value: customer.rewardStatus ?? "—" },
    { label: "Active orders", value: customer.activeOrders ?? 0 },
    { label: "Completed orders", value: customer.completedOrders ?? 0 },
    { label: "Buy history", value: customer.buyHistory ?? 0 },
    { label: "Exchange history", value: customer.exchangeHistory ?? 0 },
    { label: "Saved wallets", value: customer.savedWallets ?? 0 },
    { label: "Last activity", value: relativeTime(customer.lastActivity) || "—" },
    { label: "Browser", value: customer.browser ?? "—" },
    { label: "Device", value: customer.device ?? "—" },
    { label: "Language", value: customer.preferredLanguage ?? "—" },
  ];

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-card lg:flex">
      <div className="border-b border-border p-4 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-base font-semibold text-primary-foreground">
          {initials(customer.name, customer.email)}
        </span>
        <p className="mt-2 text-sm font-semibold">{customer.name}</p>
        <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
      </div>

      {/* ticket controls */}
      <div className="space-y-2 border-b border-border p-3">
        <ControlRow label="Status">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_STYLES[ticket.status])}>
                {STATUS_LABELS[ticket.status] ?? ticket.status} <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <DropdownMenuItem key={v} onClick={() => update({ status: v })}>{l}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ControlRow>
        <ControlRow label="Priority">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLES[ticket.priority ?? "medium"])}>
                {PRIORITY_LABELS[ticket.priority ?? "medium"]} <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PRIORITIES.map((p) => (
                <DropdownMenuItem key={p} onClick={() => update({ priority: p })}>{PRIORITY_LABELS[p]}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ControlRow>
        <ControlRow label="Assignment">
          <span className="text-[11px] text-muted-foreground">
            {ticket.assignedAdminId ? (ticket.assignedAdminId === meId ? "You" : ticket.assignedAdminName ?? "Assigned") : "Unassigned"}
          </span>
        </ControlRow>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update({ assignedAdminId: meId })}>
            Assign to me
          </Button>
          {ticket.assignedAdminId && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update({ assignedAdminId: null })}>
              Transfer / unassign
            </Button>
          )}
          {ticket.status !== "closed" ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update({ status: "closed" })}>
              Close ticket
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => update({ status: "open" })}>
              Reopen ticket
            </Button>
          )}
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-1.5 border-b border-border p-3">
        <QuickAction icon={User} label="Profile" />
        <QuickAction icon={ShoppingCart} label="Orders" />
        <QuickAction icon={Wallet} label="Wallets" />
        <QuickAction icon={Gift} label="Rewards" />
        <QuickAction icon={Copy} label="Copy email" onClick={() => copy("Email", customer.email)} />
        <QuickAction icon={Copy} label="Copy order" onClick={() => copy("Order ID", ticket.relatedOrderId)} />
      </div>

      {/* details */}
      <div className="p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer information</p>
        <dl className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="truncate text-right font-medium text-foreground">{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldAlert className="size-3" /> IP &amp; secrets stay backend-side and are never shown here.
        </p>
      </div>

      {/* add note */}
      <div className="mt-auto border-t border-border p-3">
        <Textarea
          rows={2}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Add internal note…"
          className="resize-none text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full text-xs"
          disabled={!noteDraft.trim()}
          onClick={async () => {
            await adminApi.addNote(ticketId, noteDraft.trim());
            setNoteDraft("");
            await onRefetch();
            toast.success("Note saved.");
          }}
        >
          Save note
        </Button>
      </div>
    </aside>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-3.5 shrink-0" /> <span className="truncate">{label}</span>
    </button>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function customerRepliedAfter(messages: ApiSupportMessage[], m: ApiSupportMessage): boolean {
  const idx = messages.findIndex((x) => x.id === m.id);
  return messages.slice(idx + 1).some((x) => x.senderType === "customer");
}

function isImage(name?: string): boolean {
  return !!name && /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let audioCtx: AudioContext | null = null;
function playPing() {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    o.start();
    o.stop(audioCtx.currentTime + 0.25);
  } catch {
    /* ignore */
  }
}
