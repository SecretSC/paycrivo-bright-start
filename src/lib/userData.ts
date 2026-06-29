import type { Order } from "@/lib/checkout";
import type { ExchangeOrder } from "@/lib/exchange";

// Returns orders belonging to a user: matched by userId (when linked) OR by
// the account email (covers guest checkouts made with the same email).
export function getUserBuyOrders(userId: string, email: string): Order[] {
  const e = email.trim().toLowerCase();
  let list: (Order & { userId?: string })[] = [];
  try {
    list = JSON.parse(localStorage.getItem("paycrivo-orders") ?? "[]");
  } catch {
    list = [];
  }
  return list.filter(
    (o) => o.userId === userId || (o.email ?? "").trim().toLowerCase() === e,
  );
}

export function getUserExchangeOrders(userId: string, email: string): ExchangeOrder[] {
  const e = email.trim().toLowerCase();
  let list: (ExchangeOrder & { userId?: string })[] = [];
  try {
    list = JSON.parse(localStorage.getItem("paycrivo_exchange_orders") ?? "[]");
  } catch {
    list = [];
  }
  return list.filter(
    (o) => o.userId === userId || (o.email ?? "").trim().toLowerCase() === e,
  );
}
