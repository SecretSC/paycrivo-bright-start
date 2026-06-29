import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  MessageCircle,
  X,
  Minus,
  Send,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Headset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supportApi } from "@/lib/api/support";
import { useRealtimePoll } from "@/providers/RealtimeProvider";
import type { ApiSupportMessage, ApiSupportTicket } from "@/lib/api/types";
import { loadDraft } from "@/lib/checkout";
import { loadExchangeDraft } from "@/lib/exchange";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Persistence (UI state only — conversation itself lives in backend/fallback)
// ---------------------------------------------------------------------------
const ACTIVE_TICKET_KEY = "paycrivo_support_active_ticket";
const SEEN_AT_KEY = "paycrivo_support_seen_at";

type Topic = "purchase" | "exchange" | "wallet" | "account" | "reward" | "other";
const TOPICS: { value: Topic; label: string }[] = [
  { value: "purchase", label: "Purchase help" },
  { value: "exchange", label: "Exchange help" },
  { value: "wallet", label: "Wallet address help" },
  { value: "account", label: "Account help" },
  { value: "reward", label: "Reward claim" },
  { value: "other", label: "Other" },
];

const BUY_STEPS = ["Amount", "Email", "Your details", "Wallet", "Wallet ownership", "Review"];
const EXCHANGE_STEPS = ["Pair", "Email", "Wallet", "Wallet ownership", "Send crypto", "Review"];

// Detect attempts to share secrets we must never collect.
const SECRET_RE =
  /\b(seed\s?phrase|recovery\s?phrase|mnemonic|private\s?key|secret\s?key|pass\s?word|passphrase|cvv|card\s?number)\b/i;

type Stage = "welcome" | "form" | "chat";

// Agent availability for the UI (business hours, local time). Backend transport
// status is intentionally never surfaced to customers.
function useAgentsOnline(): boolean {
  return useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22;
  }, []);
}

type SafeMeta = {
  currentPage: string;
  flow?: "buy" | "exchange";
  step?: string;
  relatedOrderId?: string;
  selectedAsset?: string;
  selectedFiat?: string;
  sendAsset?: string;
  receiveAsset?: string;
};

function useSupportMeta(): SafeMeta {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return useMemo<SafeMeta>(() => {
    const meta: SafeMeta = { currentPage: pathname };
    if (pathname.startsWith("/buy")) {
      const d = loadDraft();
      meta.flow = "buy";
      if (d) {
        meta.step = BUY_STEPS[d.step] ?? String(d.step);
        meta.selectedAsset = d.coin;
        meta.selectedFiat = d.fiat;
      }
    } else if (pathname.startsWith("/exchange")) {
      const d = loadExchangeDraft();
      meta.flow = "exchange";
      if (d) {
        meta.step = EXCHANGE_STEPS[d.step] ?? String(d.step);
        meta.sendAsset = d.sendCoin;
        meta.receiveAsset = d.receiveCoin;
      }
    }
    const orderMatch = pathname.match(/order\/([^/]+)/);
    if (orderMatch) meta.relatedOrderId = orderMatch[1];
    return meta;
  }, [pathname]);
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function SupportWidget() {
  const { user } = useAuth();
  const meta = useSupportMeta();
  const online = useAgentsOnline();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("welcome");
  const [ticket, setTicket] = useState<ApiSupportTicket | null>(null);
  const [messages, setMessages] = useState<ApiSupportMessage[]>([]);
  const [unread, setUnread] = useState(0);

  // restore active ticket on mount
  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(ACTIVE_TICKET_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!activeTicketId) return;
    let cancelled = false;
    supportApi
      .getMessages(activeTicketId)
      .then(({ ticket: t, messages: m }) => {
        if (cancelled) return;
        setTicket(t);
        setMessages(m);
        setStage("chat");
      })
      .catch(() => {
        // ticket no longer exists — reset
        try {
          localStorage.removeItem(ACTIVE_TICKET_KEY);
        } catch {
          /* ignore */
        }
        setActiveTicketId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTicketId]);

  // ---- Realtime polling for new messages while a ticket is active ----
  const fetchMessages = useCallback(async () => {
    if (!activeTicketId) return null;
    return supportApi.getMessages(activeTicketId);
  }, [activeTicketId]);

  const { data: polled } = useRealtimePoll(
    `support:${activeTicketId ?? "none"}`,
    fetchMessages,
    { enabled: !!activeTicketId },
  );

  useEffect(() => {
    if (!polled) return;
    setTicket(polled.ticket);
    setMessages(polled.messages);
  }, [polled]);

  // Track unread agent/system replies when widget is closed.
  const lastSeenRef = useRef<number>(0);
  useEffect(() => {
    try {
      lastSeenRef.current = Number(localStorage.getItem(SEEN_AT_KEY) ?? 0);
    } catch {
      lastSeenRef.current = 0;
    }
  }, []);

  useEffect(() => {
    if (open) {
      const now = Date.now();
      lastSeenRef.current = now;
      try {
        localStorage.setItem(SEEN_AT_KEY, String(now));
      } catch {
        /* ignore */
      }
      setUnread(0);
      return;
    }
    const count = messages.filter(
      (m) => m.senderType !== "customer" && new Date(m.createdAt).getTime() > lastSeenRef.current,
    ).length;
    setUnread(count);
  }, [messages, open]);

  const promptText = meta.flow ? "Need help with your order?" : "Need assistance with your purchase?";

  const openWidget = () => {
    setOpen(true);
    if (activeTicketId) setStage("chat");
  };

  return (
    <>
      {/* ---------------------------- Floating bubble ---------------------------- */}
      {!open && (
        <button
          type="button"
          onClick={openWidget}
          aria-label="Open PayCrivo support chat"
          className="animate-support-pulse fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-[60] flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="size-6" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      )}

      {/* ------------------------------- Panel ------------------------------- */}
      {open && (
        <div className="animate-scale-in fixed inset-x-0 bottom-0 z-[60] mx-auto flex h-[88dvh] max-h-[640px] w-full max-w-[400px] flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:rounded-2xl">
          <SupportPanel
            user={user}
            meta={meta}
            promptText={promptText}
            online={online}
            stage={stage}
            setStage={setStage}
            ticket={ticket}
            messages={messages}
            onTicketCreated={(t, m) => {
              setTicket(t);
              setMessages(m);
              setActiveTicketId(t.id);
              try {
                localStorage.setItem(ACTIVE_TICKET_KEY, t.id);
              } catch {
                /* ignore */
              }
              setStage("chat");
            }}
            onSend={async (text) => {
              if (!ticket) return;
              const m = await supportApi.sendMessage(ticket.id, text);
              setMessages((prev) => [...prev, m]);
            }}
            onMinimize={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel (welcome / form / chat)
// ---------------------------------------------------------------------------
function SupportPanel({
  user,
  meta,
  promptText,
  online,
  stage,
  setStage,
  ticket,
  messages,
  onTicketCreated,
  onSend,
  onMinimize,
  onClose,
}: {
  user: ReturnType<typeof useAuth>["user"];
  meta: SafeMeta;
  promptText: string;
  online: boolean;
  stage: Stage;
  setStage: (s: Stage) => void;
  ticket: ApiSupportTicket | null;
  messages: ApiSupportMessage[];
  onTicketCreated: (t: ApiSupportTicket, m: ApiSupportMessage[]) => void;
  onSend: (text: string) => Promise<void>;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-border bg-gradient-to-br from-primary to-primary-glow px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
            <Headset className="size-4.5" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-primary",
                online ? "bg-emerald-400" : "bg-muted-foreground",
              )}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">PayCrivo Support</p>
            <p className="truncate text-xs text-primary-foreground/80">
              {online ? "Typically replies within a few minutes" : "Offline · we'll reply by email"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            aria-label="Minimize chat"
            className="grid size-8 place-items-center rounded-lg text-primary-foreground/90 transition-colors hover:bg-primary-foreground/15"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="grid size-8 place-items-center rounded-lg text-primary-foreground/90 transition-colors hover:bg-primary-foreground/15"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {stage === "welcome" && (
        <WelcomeScreen promptText={promptText} online={online} onStart={() => setStage("form")} />
      )}
      {stage === "form" && (
        <DetailsForm user={user} meta={meta} onCreated={onTicketCreated} onBack={() => setStage("welcome")} />
      )}
      {stage === "chat" && ticket && (
        <Conversation ticket={ticket} messages={messages} online={online} onSend={onSend} />
      )}
    </>
  );
}

function WelcomeScreen({ promptText, online, onStart }: { promptText: string; online: boolean; onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-between overflow-y-auto p-5">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground">Hi 👋 Welcome to PayCrivo Support</h3>
        <p className="text-sm text-muted-foreground">{promptText}</p>
        <p className="text-sm text-muted-foreground">
          {online
            ? "Tell us a bit about what you need and a PayCrivo support agent will help you out."
            : "Our team is offline right now. Leave us a message and we'll reply by email."}
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            We will never ask for your seed phrase, private keys, passwords, or full card details.
          </span>
        </div>
        <Button onClick={onStart} className="w-full">
          {online ? "Start a conversation" : "Leave a message"}
        </Button>
      </div>
    </div>
  );
}

function DetailsForm({
  user,
  meta,
  onCreated,
  onBack,
}: {
  user: ReturnType<typeof useAuth>["user"];
  meta: SafeMeta;
  onCreated: (t: ApiSupportTicket, m: ApiSupportMessage[]) => void;
  onBack: () => void;
}) {
  const loggedIn = !!user;
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [topic, setTopic] = useState<Topic>(
    meta.flow === "buy" ? "purchase" : meta.flow === "exchange" ? "exchange" : "purchase",
  );
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [secretWarning, setSecretWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address.";
    if (message.trim().length < 5) e.message = "Please describe your issue (min 5 characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onMessageChange = (v: string) => {
    setMessage(v);
    setSecretWarning(SECRET_RE.test(v));
  };

  const submit = async () => {
    setSubmitError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { ticket, messages } = await supportApi.createTicket({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
        currentPage: meta.currentPage,
        flow: meta.flow,
        step: meta.step,
        relatedOrderId: meta.relatedOrderId,
      });
      onCreated(ticket, messages);
    } catch {
      setSubmitError("We couldn't start the chat. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-custom">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 px-4 pt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back
      </button>
      <form
        className="space-y-3 p-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
      >
        {loggedIn && (
          <p className="rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
            Signed in as {user?.email}. We've prefilled your details.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="sw-first" className="text-xs">First name</Label>
            <Input id="sw-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loggedIn} />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="sw-last" className="text-xs">Last name</Label>
            <Input id="sw-last" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loggedIn} />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sw-email" className="text-xs">Email</Label>
          <Input id="sw-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loggedIn} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="sw-topic" className="text-xs">Topic</Label>
          <select
            id="sw-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="sw-message" className="text-xs">Message</Label>
          <Textarea
            id="sw-message"
            rows={3}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="How can we help?"
          />
          {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
        </div>
        {secretWarning && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>Never share wallet secrets, seed phrases, private keys, or passwords.</span>
          </div>
        )}
        {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Send message"}
        </Button>
      </form>
    </div>
  );
}

function Conversation({
  ticket,
  messages,
  online,
  onSend,
}: {
  ticket: ApiSupportTicket;
  messages: ApiSupportMessage[];
  online: boolean;
  onSend: (text: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [secretWarning, setSecretWarning] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  // Show an agent typing indicator while the customer is waiting on a reply.
  const lastMsg = messages[messages.length - 1];
  const awaitingReply = online && !!lastMsg && lastMsg.senderType === "customer";

  const onChange = (v: string) => {
    setDraft(v);
    setSecretWarning(SECRET_RE.test(v));
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft("");
      setSecretWarning(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="border-b border-border bg-muted/30 px-4 py-1.5 text-center text-[11px] text-muted-foreground">
        Ticket #{ticket.ticketNumber} • {ticket.status}
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-custom p-4">
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
            Hi 👋 Welcome to PayCrivo Support. How can we help you today?
          </div>
        </div>
        {messages.map((m) => {
          if (m.senderType === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
                  {m.message}
                </span>
              </div>
            );
          }
          const mine = m.senderType === "customer";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] space-y-1", mine ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.message}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  <span>{fmtTime(m.createdAt)}</span>
                  {mine && <CheckCircle2 className="size-3 text-primary" aria-label="Delivered" />}
                </div>
              </div>
            </div>
          );
        })}
        {awaitingReply && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {secretWarning && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>Never share wallet secrets, seed phrases, private keys, or passwords.</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="max-h-28 min-h-9 resize-none"
          />
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}