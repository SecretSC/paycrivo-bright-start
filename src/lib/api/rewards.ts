// $20 welcome reward wired to the backend, with localStorage preview fallback.
import { apiFetch, withFallback, tokenStore } from "./client";
import type { ApiRewardClaim } from "./types";
import { getReward, claimReward, type Reward, type WalletOwnership } from "@/lib/reward";

function toReward(c: ApiRewardClaim): Reward {
  const status: Reward["status"] =
    c.status === "available" ? "available" : c.status === "rejected" || c.status === "completed" ? "claimed" : "pending";
  return {
    id: c.id,
    userId: c.userId,
    amountUsd: c.amountUsd,
    status,
    selectedAsset: c.selectedAsset ?? undefined,
    selectedNetwork: c.selectedNetwork ?? undefined,
    walletAddress: c.walletAddress ?? undefined,
    walletOwnershipStatus: (c.walletOwnership as WalletOwnership) ?? undefined,
    createdAt: c.createdAt,
  };
}

export const rewardsApi = {
  async get(userId: string): Promise<Reward> {
    return withFallback(
      async () => {
        if (!tokenStore.getCustomer()) return getReward(userId);
        const { claim } = await apiFetch<{ claim: ApiRewardClaim }>("/api/rewards", { auth: "customer" });
        return toReward(claim);
      },
      () => getReward(userId),
    );
  },

  async claim(
    userId: string,
    data: { selectedAsset: string; selectedNetwork: string; walletAddress: string; walletOwnershipStatus: WalletOwnership },
  ): Promise<Reward> {
    return withFallback(
      async () => {
        const { claim } = await apiFetch<{ claim: ApiRewardClaim }>("/api/rewards/claim", {
          method: "POST",
          auth: "customer",
          body: {
            selectedAsset: data.selectedAsset,
            selectedNetwork: data.selectedNetwork,
            walletAddress: data.walletAddress,
            walletOwnership: data.walletOwnershipStatus,
          },
        });
        return toReward(claim);
      },
      () => claimReward(userId, data),
    );
  },
};
