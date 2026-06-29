import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Gift, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset } from "@/data/cryptoAssets";
import { validateWalletAddress } from "@/lib/checkout";
import { addWallet } from "@/lib/wallets";
import { recordEvent } from "@/lib/liveLog";
import { WalletConnect, type WalletConnectStatus } from "@/components/wallet/WalletConnect";
import {
  claimReward, getReward, REWARD_AMOUNT_USD, REWARD_ASSETS, REWARD_NETWORKS,
  type Reward, type WalletOwnership,
} from "@/lib/reward";

export const Route = createFileRoute("/account/reward")({
  component: RewardPage,
});

const iconColor = (s: string) => getAsset(s)?.iconColor ?? "#8b5cf6";

function RewardPage() {
  const { user } = useAuth();
  const [reward, setReward] = useState<Reward | null>(null);
  const [step, setStep] = useState(1);
  const [asset, setAsset] = useState<string>("USDT");
  const [network, setNetwork] = useState(REWARD_NETWORKS["USDT"][0]);
  const [address, setAddress] = useState("");
  const [riskOk, setRiskOk] = useState(false);
  const [saveWallet, setSaveWallet] = useState(false);
  const [ownership, setOwnership] = useState<WalletOwnership | "none">("none");
  const [walletStatus, setWalletStatus] = useState<WalletConnectStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setReward(getReward(user.id));
  }, [user]);

  // Already claimed / pending → show status only
  if (reward && (reward.status === "pending" || reward.status === "claimed")) {
    return <SubmittedView reward={reward} />;
  }

  const pickAsset = (a: string) => {
    setAsset(a);
    setNetwork(REWARD_NETWORKS[a][0]);
  };

  const next = () => {
    setError(null);
    if (step === 3) {
      const err = validateWalletAddress(address.trim(), network);
      if (err) { setError(err); return; }
      if (!riskOk) { setError("Please confirm the network is correct."); return; }
    }
    if (step === 4 && ownership === "none") {
      setError("Confirm wallet ownership to continue.");
      return;
    }
    if (step === 4) {
      if (!user) return;
      if (saveWallet) addWallet(user.id, { coin: asset, network, address: address.trim(), nickname: `${asset} reward wallet` });
      const updated = claimReward(user.id, {
        selectedAsset: asset, selectedNetwork: network, walletAddress: address.trim(),
        walletOwnershipStatus: ownership as WalletOwnership,
      });
      setReward(updated);
      recordEvent("reward_claim", { email: user.email, label: `Reward claim submitted: ${asset}` });
      // optional reward email (best-effort)
      fetch("/api/email/reward-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, asset, network, amountUsd: REWARD_AMOUNT_USD }),
      }).catch(() => {});
      setStep(5);
      return;
    }
    setStep((s) => s + 1);
  };

  if (step === 5 && reward) return <SubmittedView reward={reward} />;

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><Gift className="size-6" /></span>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Claim your ${REWARD_AMOUNT_USD} welcome reward</h2>
          <p className="text-sm text-muted-foreground">Step {step} of 4 · One reward per customer</p>
        </div>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="mt-6">
        {step === 1 && (
          <Section title="Choose asset" subtitle="Select the crypto you'd like your reward in.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {REWARD_ASSETS.map((a) => (
                <button key={a} onClick={() => pickAsset(a)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors ${asset === a ? "border-primary bg-accent/40" : "border-border hover:border-primary/40"}`}>
                  <CryptoIcon symbol={a} color={iconColor(a)} size={32} />
                  <span className="text-sm font-semibold text-foreground">{a}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="Choose network" subtitle={`Select the network for your ${asset} reward.`}>
            <div className="grid gap-2 sm:grid-cols-2">
              {REWARD_NETWORKS[asset].map((n) => (
                <button key={n} onClick={() => setNetwork(n)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${network === n ? "border-primary bg-accent/40 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {n}
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section title="Enter wallet address" subtitle={`Your ${asset} (${network}) address.`}>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`Your ${asset} address`} className={inp} />
            <label className="mt-3 flex items-start gap-2.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={riskOk} onChange={(e) => setRiskOk(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
              <span>I confirm this address is on the <strong className="text-foreground">{network}</strong> network. Sending to the wrong network may cause loss.</span>
            </label>
            <label className="mt-2 flex items-center gap-2.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={saveWallet} onChange={(e) => setSaveWallet(e.target.checked)} className="size-4 accent-primary" />
              <span>Save this wallet to my account</span>
            </label>
          </Section>
        )}

        {step === 4 && (
          <Section title="Confirm wallet ownership" subtitle="Confirm you control this wallet to help protect your reward.">
            <WalletConnect
              coin={asset}
              network={network}
              status={walletStatus}
              onStatusChange={(s) => {
                setWalletStatus(s);
                if (s === "verified") { setOwnership("confirmed"); setError(null); }
              }}
            />
          </Section>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => { setStep((s) => s - 1); setError(null); }} className="inline-flex items-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary">
              <ArrowLeft className="size-4" /> Back
            </button>
          )}
          <button onClick={next} className="bg-gradient-primary inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft">
            {step === 4 ? "Submit claim" : "Continue"} <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmittedView({ reward }: { reward: Reward }) {
  const steps = [
    { label: "Reward selected", done: true },
    { label: "Wallet added", done: true },
    { label: reward.walletOwnershipStatus === "manual" ? "Wallet ownership · manual review" : "Wallet ownership confirmed", done: true },
    { label: "Reward queued", done: true },
    { label: "Completed", done: false },
  ];
  const short = reward.walletAddress ? `${reward.walletAddress.slice(0, 8)}…${reward.walletAddress.slice(-6)}` : "—";
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-success/15 text-success"><CheckCircle2 className="size-6" /></span>
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Reward claim submitted</h2>
          <p className="text-sm text-muted-foreground">Status: {reward.walletOwnershipStatus === "manual" ? "Pending review" : "Wallet confirmed · pending review"}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-2.5 rounded-2xl border border-border bg-surface p-4 text-sm">
        <Row k="Reward amount" v={`$${reward.amountUsd} equivalent`} />
        <Row k="Asset" v={reward.selectedAsset ?? "—"} />
        <Row k="Network" v={reward.selectedNetwork ?? "—"} />
        <Row k="Wallet address" v={short} />
      </dl>

      <div className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="size-4" /> Timeline</p>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${s.done ? "bg-success/15 text-success" : "bg-surface text-muted-foreground"}`}>
                {s.done ? <CheckCircle2 className="size-4" /> : i + 1}
              </span>
              <span className={`text-sm ${s.done ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">Reward availability may vary. One reward per customer.</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold text-foreground">{v}</dd>
    </div>
  );
}
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      <p className="mb-4 mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
const inp = "w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary";
