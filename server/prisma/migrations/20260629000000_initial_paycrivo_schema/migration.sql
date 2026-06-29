-- PayCrivo initial PostgreSQL schema.
-- Idempotent so existing VPS databases created before migrations existed can
-- be safely brought under Prisma migrate deploy.

DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'support_agent', 'order_manager', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "country" TEXT,
  "phone" TEXT,
  "preferredFiat" TEXT DEFAULT 'USD',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_notes" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "adminId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "role" "AdminRole" NOT NULL DEFAULT 'viewer',
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT NOT NULL,
  "email" TEXT,
  "currentPage" TEXT,
  "flow" TEXT DEFAULT 'homepage',
  "step" TEXT,
  "selectedAsset" TEXT,
  "selectedFiat" TEXT,
  "relatedOrderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'browsing',
  "deviceType" TEXT,
  "browser" TEXT,
  "country" TEXT,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "live_events" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "live_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "fiat" TEXT,
  "spendAmount" TEXT,
  "sendCoin" TEXT,
  "sendAmount" TEXT,
  "receiveCoin" TEXT,
  "receiveAmount" TEXT,
  "coin" TEXT,
  "walletAddress" TEXT,
  "walletOwnership" TEXT DEFAULT 'manual',
  "paymentStatus" TEXT DEFAULT 'awaiting_payment',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_events" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "order_notes" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "adminId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "coin" TEXT NOT NULL,
  "network" TEXT,
  "address" TEXT NOT NULL,
  "nickname" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reward_claims" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "amountUsd" DOUBLE PRECISION NOT NULL DEFAULT 20,
  "selectedAsset" TEXT,
  "selectedNetwork" TEXT,
  "walletAddress" TEXT,
  "walletOwnership" TEXT DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'available',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" TEXT NOT NULL,
  "ticketNumber" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "topic" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "currentPage" TEXT,
  "flow" TEXT,
  "step" TEXT,
  "relatedOrderId" TEXT,
  "sessionId" TEXT,
  "assignedAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "senderId" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_conversation_events" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_conversation_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ticket_notes" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "adminId" TEXT,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_action_logs" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT,
  "targetId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_codes" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumed" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "json" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "user_notes_userId_idx" ON "user_notes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_anonId_key" ON "sessions"("anonId");
CREATE INDEX IF NOT EXISTS "sessions_status_idx" ON "sessions"("status");
CREATE INDEX IF NOT EXISTS "live_events_sessionId_idx" ON "live_events"("sessionId");
CREATE INDEX IF NOT EXISTS "live_events_createdAt_idx" ON "live_events"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_reference_key" ON "orders"("reference");
CREATE INDEX IF NOT EXISTS "orders_type_idx" ON "orders"("type");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "order_events_orderId_idx" ON "order_events"("orderId");
CREATE INDEX IF NOT EXISTS "order_notes_orderId_idx" ON "order_notes"("orderId");
CREATE INDEX IF NOT EXISTS "wallets_userId_idx" ON "wallets"("userId");
CREATE INDEX IF NOT EXISTS "reward_claims_status_idx" ON "reward_claims"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_email_idx" ON "support_tickets"("email");
CREATE INDEX IF NOT EXISTS "support_messages_ticketId_idx" ON "support_messages"("ticketId");
CREATE INDEX IF NOT EXISTS "support_conversation_events_ticketId_idx" ON "support_conversation_events"("ticketId");
CREATE INDEX IF NOT EXISTS "ticket_notes_ticketId_idx" ON "ticket_notes"("ticketId");
CREATE INDEX IF NOT EXISTS "admin_action_logs_createdAt_idx" ON "admin_action_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "email_codes_email_purpose_idx" ON "email_codes"("email", "purpose");

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_notes_userId_fkey') THEN ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_userId_fkey') THEN ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_events_sessionId_fkey') THEN ALTER TABLE "live_events" ADD CONSTRAINT "live_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_events_userId_fkey') THEN ALTER TABLE "live_events" ADD CONSTRAINT "live_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_userId_fkey') THEN ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_events_orderId_fkey') THEN ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_notes_orderId_fkey') THEN ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wallets_userId_fkey') THEN ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_claims_userId_fkey') THEN ALTER TABLE "reward_claims" ADD CONSTRAINT "reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_userId_fkey') THEN ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_ticketId_fkey') THEN ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_conversation_events_ticketId_fkey') THEN ALTER TABLE "support_conversation_events" ADD CONSTRAINT "support_conversation_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_notes_ticketId_fkey') THEN ALTER TABLE "ticket_notes" ADD CONSTRAINT "ticket_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_action_logs_adminId_fkey') THEN ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
