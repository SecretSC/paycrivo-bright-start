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
  /** Internal note authored by an agent (never shown to the customer). */
  internal?: boolean;
  senderName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export type ApiSupportTicket = {
  id: string;
  ticketNumber: string;
  status: string;
  topic: string;
  lastMessageAt?: string | null;
  // Optional admin-facing metadata (populated by backend; also mirrored in the
  // preview fallback so the admin inbox is usable without a backend).
  email?: string;
  customerName?: string;
  country?: string;
  priority?: string;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  createdAt?: string;
  relatedOrderId?: string | null;
  flow?: string | null;
  currentPage?: string | null;
};

// ----------------------------- Admin support -----------------------------
export type AdminTicketNote = {
  id: string;
  ticketId: string;
  adminId: string;
  note: string;
  createdAt: string;
};

export type AdminCustomerInfo = {
  name: string;
  email: string;
  country?: string | null;
  registeredAt?: string | null;
  emailVerified?: boolean;
  rewardStatus?: string;
  activeOrders?: number;
  completedOrders?: number;
  buyHistory?: number;
  exchangeHistory?: number;
  savedWallets?: number;
  lastActivity?: string | null;
  browser?: string | null;
  device?: string | null;
  preferredLanguage?: string | null;
};

export type AdminTicketDetail = {
  ticket: ApiSupportTicket;
  messages: ApiSupportMessage[];
  notes: AdminTicketNote[];
  customer: AdminCustomerInfo;
  order?: ApiOrder | null;
};

export type AdminDashboardStats = {
  openTickets: number;
  waitingCustomers: number;
  resolvedToday: number;
  activeAgents: number;
  onlineVisitors: number;
  avgResponseMins: number;
  avgResolutionMins: number;
};
