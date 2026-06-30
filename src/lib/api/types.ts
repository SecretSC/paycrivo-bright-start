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

// ----------------------------- Live Operations (Phase E) -----------------------------
export type LiveVisitorStatus = "active" | "idle" | "abandoned" | "completed";

export type LiveVisitor = {
  sessionId: string;
  email?: string | null;
  currentPage: string;
  flow: "buy" | "exchange" | "account" | "reward" | "support" | "browsing";
  step?: string | null;
  selectedAsset?: string | null;
  selectedFiat?: string | null;
  lastActivity: string;
  device: string;
  browser: string;
  status: LiveVisitorStatus;
  needsHelp?: boolean;
  country?: string | null;
  lastAction?: string | null;
  personal?: {
    firstName?: string | null;
    lastName?: string | null;
    country?: string | null;
    phone?: string | null;
    emailVerified?: boolean;
  } | null;
  order?: {
    reference: string;
    type: string;
    status: string;
    asset?: string | null;
    network?: string | null;
    amount?: string | null;
    fiat?: string | null;
    walletAddress?: string | null;
  } | null;
};

export type LiveOpsEventType =
  | "page_view"
  | "checkout_started"
  | "email_entered"
  | "email_verified"
  | "wallet_step"
  | "wallet_validation_failed"
  | "ownership_confirmed"
  | "order_created"
  | "support_opened"
  | "ticket_created"
  | "otp_failed"
  | "reward_claim"
  | "nav_suggestion";

export type LiveOpsEvent = {
  id: string;
  type: LiveOpsEventType;
  label: string;
  sessionId?: string | null;
  email?: string | null;
  createdAt: string;
};

export type ServiceHealth = "operational" | "degraded" | "down";

export type LiveOpsHealth = {
  api: ServiceHealth;
  smtp: ServiceHealth;
  backend: ServiceHealth;
};

export type LiveOpsMetrics = {
  activeVisitors: number;
  activeBuyCheckouts: number;
  activeExchangeCheckouts: number;
  openSupportChats: number;
  waitingTickets: number;
  recentSignups: number;
  recentOrders: number;
  failedValidations: number;
  walletValidationErrors: number;
  otpFailures: number;
  rewardClaims: number;
};

export type LiveOpsSnapshot = {
  metrics: LiveOpsMetrics;
  visitors: LiveVisitor[];
  orders: ApiOrder[];
  tickets: ApiSupportTicket[];
  signups: { email: string; createdAt: string }[];
  events: LiveOpsEvent[];
  health: LiveOpsHealth;
};
