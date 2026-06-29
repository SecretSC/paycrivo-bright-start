// Transport-agnostic realtime layer for PayCrivo.
//
// Default transport is POLLING (every 2.5s) per the approved Phase 8–10 plan —
// maximally compatible and self-host ready. The abstraction lets a WebSocket /
// SSE transport be swapped in later without touching call sites: components use
// `useRealtimePoll(key, fetcher, opts)` and never talk to the transport directly.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const DEFAULT_POLL_INTERVAL_MS = 2500;

type Subscriber = {
  key: string;
  intervalMs: number;
  fetcher: () => Promise<unknown>;
  onData: (data: unknown) => void;
  onError: (err: unknown) => void;
  enabled: boolean;
};

export type RealtimeTransport = {
  kind: "polling" | "websocket" | "sse";
  subscribe: (sub: Subscriber) => () => void;
};

// ----------------------------- Polling transport -----------------------------
function createPollingTransport(): RealtimeTransport {
  return {
    kind: "polling",
    subscribe(sub) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const run = async () => {
        if (stopped) return;
        if (sub.enabled && (typeof document === "undefined" || document.visibilityState === "visible")) {
          try {
            const data = await sub.fetcher();
            if (!stopped) sub.onData(data);
          } catch (err) {
            if (!stopped) sub.onError(err);
          }
        }
        if (!stopped) timer = setTimeout(run, sub.intervalMs);
      };

      // Initial fetch immediately, then poll on the interval.
      run();

      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
      };
    },
  };
}

type RealtimeContextValue = {
  transport: RealtimeTransport;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({
  children,
  transport,
}: {
  children: ReactNode;
  transport?: RealtimeTransport;
}) {
  const value = useMemo<RealtimeContextValue>(
    () => ({ transport: transport ?? createPollingTransport() }),
    [transport],
  );
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

function useRealtimeTransport(): RealtimeTransport {
  const ctx = useContext(RealtimeContext);
  // Allow use outside a provider by falling back to a private polling transport.
  const fallback = useRef<RealtimeTransport>();
  if (ctx) return ctx.transport;
  if (!fallback.current) fallback.current = createPollingTransport();
  return fallback.current;
}

export type RealtimePollResult<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** Manually trigger a fetch outside the poll cycle. */
  refetch: () => Promise<void>;
};

/**
 * Subscribe to a value that refreshes on the realtime transport (polling by
 * default). The fetcher should be stable or memoized by the caller.
 */
export function useRealtimePoll<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { intervalMs?: number; enabled?: boolean } = {},
): RealtimePollResult<T> {
  const { intervalMs = DEFAULT_POLL_INTERVAL_MS, enabled = true } = opts;
  const transport = useRealtimeTransport();

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(enabled);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = transport.subscribe({
      key,
      intervalMs,
      enabled,
      fetcher: () => fetcherRef.current(),
      onData: (d) => {
        setData(d as T);
        setError(null);
        setLoading(false);
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });
    return unsubscribe;
  }, [key, intervalMs, enabled, transport]);

  return { data, error, loading, refetch };
}

export function useRealtimeKind(): RealtimeTransport["kind"] {
  return useRealtimeTransport().kind;
}
