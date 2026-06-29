// Saved wallets wired to the backend, with localStorage preview fallback.
import { apiFetch, withFallback, tokenStore } from "./client";
import type { ApiWallet } from "./types";
import { loadWallets, addWallet, deleteWallet, setDefaultWallet, type SavedWallet } from "@/lib/wallets";

function toSaved(w: ApiWallet): SavedWallet {
  return {
    id: w.id,
    userId: w.userId,
    nickname: w.nickname ?? "",
    coin: w.coin,
    network: w.network ?? "",
    address: w.address,
    isDefault: w.isDefault,
    createdAt: w.createdAt,
  };
}

export const walletsApi = {
  async list(userId: string): Promise<SavedWallet[]> {
    return withFallback(
      async () => {
        if (!tokenStore.getCustomer()) return loadWallets(userId);
        const { wallets } = await apiFetch<{ wallets: ApiWallet[] }>("/api/wallets", { auth: "customer" });
        return wallets.map(toSaved);
      },
      () => loadWallets(userId),
    );
  },

  async add(
    userId: string,
    w: { coin: string; network: string; address: string; nickname: string; isDefault?: boolean },
  ): Promise<SavedWallet[]> {
    return withFallback(
      async () => {
        await apiFetch("/api/wallets", { method: "POST", body: w, auth: "customer" });
        return this.list(userId);
      },
      () => addWallet(userId, { coin: w.coin, network: w.network, address: w.address, nickname: w.nickname }),
    );
  },

  async remove(userId: string, id: string): Promise<SavedWallet[]> {
    return withFallback(
      async () => {
        await apiFetch(`/api/wallets/${encodeURIComponent(id)}`, { method: "DELETE", auth: "customer" });
        return this.list(userId);
      },
      () => deleteWallet(userId, id),
    );
  },

  async setDefault(userId: string, id: string): Promise<SavedWallet[]> {
    // Backend marks default on create; re-add not exposed, so emulate via local
    // for now and keep the signature stable.
    return setDefaultWallet(userId, id);
  },
};
