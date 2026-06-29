import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, Headphones, Repeat, XCircle } from "lucide-react";
import { CheckoutHeader } from "@/routes/buy";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset, formatTokenAmount } from "@/data/cryptoAssets";
import { getExchangeOrder, type ExchangeOrder } from "@/lib/exchange";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exchange/order/$orderId")({
  head: () => ({ meta: [{ title: "Exchange order — PayCrivo" }] }),
  component: ExchangeOrderPage,
});

function ExchangeOrderPage() {
  const { orderId } = useParams({ from: "/exchange/order/$orderId" });
  const [order, setOrder] = useState<ExchangeOrder | null | undefined>(undefined);

  useEffect(() => { setOrder(getExchangeOrder(orderId)); }, [orderId]);

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader />
        <div className="mx-auto max-w-2xl px-4 py-12"><div className="h-40 animate-pulse rounded-3xl bg-card" /></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <CheckoutHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Exchange order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find an order with ID <span className="font-mono">{orderId}</span> in this browser.
          </p>
          <Link to="/exchange" className="bg-gradient-primary mt-6 inline-block rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground">
            Back to exchange
          </Link>
        </div>
      </div>
    );
  }

  const sendAsset = getAsset(order.sendCoin)!;
  const receiveAsset = getAsset(order.receiveCoin)!;
  const depositDone = order.depositConfirmed;

  const timeline = [
    { label: "Pair selected", status: "complete" as const },
    { label: "Receiving wallet added", status: "complete" as const },
    {
      label: "Wallet ownership",
      status: order.walletOwnership === "confirmed" ? ("complete" as const) : ("staging" as const),
      note: order.walletOwnership === "manual" ? "Manual review required" : "Confirmed",
    },
    { label: "Deposit instruction generated", status: "complete" as const },
    { label: "Deposit detected", status: depositDone ? ("staging" as const) : ("pending" as const) },
    { label: "Exchange processing", status: "pending" as const },
    { label: "Crypto delivery", status: "pending" as const },
  ];

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("Copied"); };

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to="/exchange" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to exchange
        </Link>

        <div className="animate-step-in text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success">
            <Check className="size-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-foreground">Exchange order created</h1>
          <p className="mt-2 text-muted-foreground">Track the progress of your exchange below.</p>
        </div>

        {/* summary header */}
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <span className="font-mono text-sm font-bold text-foreground">{order.id}</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={order.status} />
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl bg-surface p-4">
            <div className="text-center">
              <CryptoIcon symbol={sendAsset.symbol} color={sendAsset.iconColor} size={36} />
              <div className="mt-2 text-sm font-bold text-foreground">{order.sendAmount} {sendAsset.symbol}</div>
              <div className="text-xs text-muted-foreground">You send</div>
            </div>
            <Repeat className="size-5 text-primary" />
            <div className="text-center">
              <CryptoIcon symbol={receiveAsset.symbol} color={receiveAsset.iconColor} size={36} />
              <div className="mt-2 text-sm font-bold text-foreground">{formatTokenAmount(order.receiveEstimate)} {receiveAsset.symbol}</div>
              <div className="text-xs text-muted-foreground">You receive (est.)</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <Row label="Exchange rate" value={`1 ${sendAsset.symbol} ≈ ${formatTokenAmount(order.rate)} ${receiveAsset.symbol}`} />
            <Row label="Network" value={`${order.sendNetwork} → ${order.receiveNetwork}`} />
            <Row label="Created" value={new Date(order.createdAt).toLocaleString()} />
          </div>
        </div>

        {/* timeline */}
        <Timeline items={timeline} className="mt-6" />

        {/* addresses */}
        <div className="mt-6 space-y-4">
          <AddressCard label="Receiving wallet" value={order.wallet} note={`Network: ${order.receiveNetwork}`} onCopy={() => copy(order.wallet)} />
          <AddressCard label="PayCrivo deposit address" value={order.depositAddress} note="Prototype deposit address for staging." onCopy={() => copy(order.depositAddress)} />
        </div>

        {/* support */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><Headphones className="size-5" /></div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">Need help with this exchange?</div>
              <p className="mt-1 text-sm text-muted-foreground">Our support team is available 24/7. Reference your order ID for faster assistance.</p>
            </div>
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => toast("Receipt download coming soon")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border px-6 py-3 text-sm font-bold text-foreground hover:bg-secondary">
            <Download className="size-4" /> Download receipt
          </button>
          <button onClick={() => toast("Contact support to cancel this order")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-destructive/40 px-6 py-3 text-sm font-bold text-destructive hover:bg-destructive/10">
            <XCircle className="size-4" /> Cancel order
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Link to="/exchange/checkout" reloadDocument
            className="bg-gradient-primary flex-1 rounded-2xl px-6 py-3.5 text-center text-sm font-bold text-primary-foreground shadow-soft transition-transform hover:-translate-y-0.5">
            Start another exchange
          </Link>
          <Link to="/exchange"
            className="flex-1 rounded-2xl border border-border px-6 py-3.5 text-center text-sm font-bold text-foreground transition-colors hover:bg-secondary">
            Back to exchange page
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Completed" ? "bg-success/15 text-success"
      : status === "Failed" || status === "Cancelled" ? "bg-destructive/15 text-destructive"
      : status === "Manual review" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-accent text-accent-foreground";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", tone)}>{status}</span>;
}

function AddressCard({ label, value, note, onCopy }: { label: string; value: string; note: string; onCopy: () => void }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground">{label}</div>
          <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{value}</div>
          <div className="mt-2 text-xs text-muted-foreground">{note}</div>
        </div>
        <button onClick={onCopy} className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground" aria-label="Copy">
          <Copy className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

type TLItem = { label: string; status: "complete" | "staging" | "pending"; note?: string };
function Timeline({ items, className }: { items: TLItem[]; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border bg-card p-6 shadow-soft", className)}>
      <h3 className="mb-4 font-display text-base font-bold text-foreground">Progress</h3>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={it.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("grid size-6 place-items-center rounded-full text-[10px] font-bold",
                it.status === "complete" ? "bg-success text-success-foreground"
                  : it.status === "staging" ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface text-muted-foreground")}>
                {it.status === "complete" ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < items.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-4">
              <div className="text-sm font-semibold text-foreground">{it.label}</div>
              <div className="text-xs text-muted-foreground">
                {it.note ?? (it.status === "complete" ? "Complete" : it.status === "staging" ? "Staging complete" : "Pending")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
