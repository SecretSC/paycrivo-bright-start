// Shared backend response shapes (mirror /server Prisma models, safe subset).
export type ApiUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  phone: string | null;
  preferredFiat: string | null;
  emailVerified: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export type ApiAdmin = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type ApiOrder = {
  id: string;
  reference: string;
  type: "buy" | "exchange";
  userId: string | null;
  email: string;
  fiat?: string | null;
  spendAmount?: string | null;
  sendCoin?: string | null;
  sendAmount?: string | null;
  receiveCoin?: string | null;
  receiveAmount?: string | null;
  coin?: string | null;
  walletAddress?: string | null;
  walletOwnership?: string | null;
  status: string;
  createdAt: string;
};

export type ApiWallet = {
  id: string;
  userId: string;
  coin: string;
  network?: string | null;
  address: string;
  nickname?: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type ApiRewardClaim = {
  id: string;
  userId: string;
  email: string;
  amountUsd: number;
  selectedAsset?: string | null;
  selectedNetwork?: string | null;
  walletAddress?: string | null;
  walletOwnership?: string | null;
  status: string;
  createdAt: string;
};

export type ApiSupportMessage = {
  id: string;
  ticketId: string;
  senderType: "customer" | "agent" | "system";
  message: string;
  createdAt: string;
};

export type ApiSupportTicket = {
  id: string;
  ticketNumber: string;
  status: string;
  topic: string;
  lastMessageAt?: string | null;
};
