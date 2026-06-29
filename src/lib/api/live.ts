// Safe live visitor events wired to the backend. No PII / secrets are sent —
// wallet addresses are shortened server-side. Preview fallback is a no-op so
// tracking never breaks the UI.
import { apiFetch, withFallback, isBackendConfigured } from "./client";

const ANON_KEY = "paycrivo_anon_id";

export function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export type LiveEventInput = {
  eventType: string;
  currentPage?: string;
  flow?: string;
  step?: string;
  selectedAsset?: string;
  selectedFiat?: string;
  relatedOrderId?: string;
  status?: string;
  deviceType?: string;
  browser?: string;
  country?: string;
  email?: string;
  walletAddress?: string;
};

export const liveApi = {
  async track(input: LiveEventInput): Promise<void> {
    if (!isBackendConfigured()) return; // preview: no-op
    await withFallback(
      async () => {
        await apiFetch("/api/live/track", {
          method: "POST",
          auth: "customer",
          body: { anonId: getAnonId(), ...input },
        });
      },
      () => undefined,
    );
  },

  async getSuggestion(): Promise<unknown | null> {
    if (!isBackendConfigured()) return null;
    return withFallback(
      async () => {
        const { suggestion } = await apiFetch<{ suggestion: unknown | null }>(
          `/api/live/suggestions/${encodeURIComponent(getAnonId())}`,
        );
        return suggestion;
      },
      () => null,
    );
  },
};
