import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Headphones, XCircle } from "lucide-react";
import { CheckoutHeader, Timeline } from "@/routes/buy";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { getOrder, type Order } from "@/lib/checkout";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [{ title: "Order status — PayCrivo" }],
  }),
  component: OrderStatusPage,
});

function OrderStatusPage() {
  const { orderId } = useParams({ from: "/order/$orderId" });
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    setOrder(getOrder(orderId));
  }, [orderId]);

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="h-40 animate-pulse rounded-3xl bg-card" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find an order with ID <span className="font-mono">{orderId}</span> in this browser.
          </p>
          <Link to="/" className="bg-gradient-primary mt-6 inline-block rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground">
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const timeline = [
    { label: "Order created", status: "complete" as const },
    { label: "Payment", status: "pending" as const },
    { label: "Processing", status: "pending" as const },
    { label: "Crypto delivery", status: "pending" as const },
  ];

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to homepage
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Order {order.id}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
            {order.status}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Timeline items={timeline} />

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Wallet address</div>
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{order.wallet}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Network: {order.network}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Wallet ownership:</span>
                    {order.walletOwnership === "confirmed" ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 font-bold text-success">Confirmed</span>
                    ) : order.walletOwnership === "manual" ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">Manual review</span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-muted-foreground">Not confirmed</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { navigator.clipboard?.writeText(order.wallet); toast.success("Copied"); }}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground" aria-label="Copy">
                  <Copy className="size-4" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Headphones className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">Need help with this order?</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Our support team is available 24/7. Reference your order ID for faster assistance.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => toast("Receipt download coming soon")}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-bold text-foreground hover:bg-secondary">
                <Download className="size-4" /> Download receipt
              </button>
              <button onClick={() => toast("Contact support to cancel this order")}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-destructive/40 px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive/10">
                <XCircle className="size-4" /> Cancel order
              </button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <OrderSummary spend={order.spend} fiat={order.fiat} coin={order.coin} method={order.method}
              network={order.network} wallet={order.wallet} />
          </aside>
        </div>
      </div>
    </div>
  );
}
