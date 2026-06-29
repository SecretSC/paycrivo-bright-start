// Orders wired to the backend. Real persistence uses the backend; the preview
// fallback reads/writes the existing localStorage order stores.
import { apiFetch, withFallback, tokenStore } from "./client";
import type { ApiOrder } from "./types";

type CreateOrderInput = {
  type: "buy" | "exchange";
  email: string;
  fiat?: string;
  spendAmount?: string;
  sendCoin?: string;
  sendAmount?: string;
  receiveCoin?: string;
  receiveAmount?: string;
  coin?: string;
  walletAddress?: string;
  walletOwnership?: "confirmed" | "manual";
  metadata?: Record<string, unknown>;
};

function localKey(type: "buy" | "exchange") {
  return type === "buy" ? "paycrivo-orders" : "paycrivo_exchange_orders";
}
function readLocal(key: string): Record<string, unknown>[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const ordersApi = {
  async create(input: CreateOrderInput): Promise<ApiOrder> {
    return withFallback(
      async () => {
        const { order } = await apiFetch<{ order: ApiOrder }>("/api/orders", {
          method: "POST",
          body: input,
          auth: "customer",
        });
        return order;
      },
      () => {
        const order = {
          id: `local_${Date.now().toString(36)}`,
          reference: `PCV-${Date.now().toString(36).toUpperCase()}`,
          status: "created",
          createdAt: new Date().toISOString(),
          ...input,
        } as unknown as ApiOrder;
        const key = localKey(input.type);
        localStorage.setItem(key, JSON.stringify([order, ...readLocal(key)]));
        return order;
      },
    );
  },

  async list(): Promise<ApiOrder[]> {
    return withFallback(
      async () => {
        if (!tokenStore.getCustomer()) return [];
        const { orders } = await apiFetch<{ orders: ApiOrder[] }>("/api/orders", { auth: "customer" });
        return orders;
      },
      () => [...readLocal("paycrivo-orders"), ...readLocal("paycrivo_exchange_orders")] as unknown as ApiOrder[],
    );
  },

  async get(idOrRef: string): Promise<ApiOrder | null> {
    return withFallback(
      async () => {
        try {
          const { order } = await apiFetch<{ order: ApiOrder }>(`/api/orders/${encodeURIComponent(idOrRef)}`, {
            auth: "customer",
          });
          return order;
        } catch {
          return null;
        }
      },
      () => {
        const all = [...readLocal("paycrivo-orders"), ...readLocal("paycrivo_exchange_orders")];
        return (all.find((o) => o.id === idOrRef || o.reference === idOrRef) ?? null) as ApiOrder | null;
      },
    );
  },
};
