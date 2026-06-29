import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AssetPicker } from "@/components/paycrivo/AssetPicker";
import { CryptoIcon } from "@/components/CryptoIcon";
import { getAsset } from "@/data/cryptoAssets";
import { networksForAsset, validateWalletAddress } from "@/lib/checkout";
import { addWallet, deleteWallet, loadWallets, setDefaultWallet, type SavedWallet } from "@/lib/wallets";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/account/wallets")({
  component: WalletsPage,
});

function WalletsPage() {
  const hydrated = useHydrated();
  const [wallets, setWallets] = useState<SavedWallet[]>([]);
  const [coin, setCoin] = useState("BTC");
  const [network, setNetwork] = useState(networksForAsset("BTC")[0]);
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  // load on first client render
  if (hydrated && wallets.length === 0 && loadWallets().length > 0) {
    setWallets(loadWallets());
  }

  const networks = networksForAsset(coin);

  const add = () => {
    setError(null);
    const err = validateWalletAddress(address, network);
    if (err) { setError(err); return; }
    setWallets(addWallet({ coin, network, address: address.trim(), nickname: nickname.trim() }));
    setAddress(""); setNickname("");
    toast.success("Wallet saved");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Add a wallet</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lbl}>Asset</label>
            <AssetPicker value={coin} onChange={(c) => { setCoin(c); setNetwork(networksForAsset(c)[0]); }} />
          </div>
          <div>
            <label className={lbl}>Network</label>
            <select value={network} onChange={(e) => setNetwork(e.target.value)} className={inp}>
              {networks.map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className={lbl}>Wallet address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={`Your ${coin} address`} className={inp} />
        </div>
        <div className="mt-4">
          <label className={lbl}>Nickname (optional)</label>
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. My Ledger" className={inp} />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <button onClick={add} className="bg-gradient-primary mt-5 inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-primary-foreground shadow-soft">
          <Plus className="size-4" /> Add wallet
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h2 className="font-display text-lg font-bold text-foreground">Saved wallets</h2>
        <div className="mt-4 space-y-2">
          {wallets.length === 0 && <p className="text-sm text-muted-foreground">No wallets saved yet.</p>}
          {wallets.map((w) => (
            <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <CryptoIcon symbol={w.coin} color={getAsset(w.coin)?.iconColor ?? "#8b5cf6"} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {w.nickname || w.coin}
                  {w.isDefault && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Default</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{w.network} · {w.address}</p>
              </div>
              {!w.isDefault && (
                <button onClick={() => setWallets(setDefaultWallet(w.id))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Set default">
                  <Star className="size-4" />
                </button>
              )}
              <button onClick={() => setWallets(deleteWallet(w.id))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete wallet">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const inp = "w-full rounded-2xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-primary";