// PayCrivo $20 welcome reward — prototype, per-user, one claim only.
// No crypto is ever sent. Status is a review placeholder.
export type RewardStatus = "available" | "pending" | "claimed" | "expired";
export type WalletOwnership = "confirmed" | "manual";

export type Reward = {
  id: string;
  userId: string;
  amountUsd: number;
  status: RewardStatus;
  selectedAsset?: string;
  selectedNetwork?: string;
  walletAddress?: string;
  walletOwnershipStatus?: WalletOwnership;
  createdAt: string;
  claimedAt?: string;
};

export const REWARD_AMOUNT_USD = 20;

const KEY = "paycrivo_rewards";

function readAll(): Reward[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Reward[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeAll(list: Reward[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getReward(userId: string): Reward {
  const all = readAll();
  const found = all.find((r) => r.userId === userId);
  if (found) return found;
  const reward: Reward = {
    id: `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    amountUsd: REWARD_AMOUNT_USD,
    status: "available",
    createdAt: new Date().toISOString(),
  };
  writeAll([...all, reward]);
  return reward;
}

export const REWARD_ASSETS = ["USDT", "USDC", "BTC", "ETH", "SOL"] as const;

export const REWARD_NETWORKS: Record<string, string[]> = {
  USDT: ["ERC20", "TRC20", "BEP20", "Solana"],
  USDC: ["ERC20", "Solana", "Polygon"],
  BTC: ["Bitcoin"],
  ETH: ["Ethereum (ERC20)"],
  SOL: ["Solana"],
};

export function claimReward(
  userId: string,
  data: {
    selectedAsset: string;
    selectedNetwork: string;
    walletAddress: string;
    walletOwnershipStatus: WalletOwnership;
  },
): Reward {
  const all = readAll();
  const current = getReward(userId);
  if (current.status === "claimed" || current.status === "pending") return current;
  const updated: Reward = {
    ...current,
    ...data,
    status: "pending",
    claimedAt: new Date().toISOString(),
  };
  writeAll(all.map((r) => (r.userId === userId ? updated : r)));
  return updated;
}
