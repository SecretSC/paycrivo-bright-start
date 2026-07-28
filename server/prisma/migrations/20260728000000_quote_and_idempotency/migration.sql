-- ============================================================
-- Server-authoritative quote snapshots + order idempotency.
-- Frontend cannot invent totals: order creation references a
-- server-issued quote, and the same (owner, idempotencyKey)
-- pair can only ever create one order.
-- ============================================================

CREATE TABLE "quotes" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT,
  "sessionKey"     TEXT NOT NULL,
  "type"           TEXT NOT NULL DEFAULT 'buy',
  "fiat"           TEXT NOT NULL,
  "asset"          TEXT NOT NULL,
  "network"        TEXT NOT NULL,
  "paymentMethod"  TEXT NOT NULL,
  "spendAmount"    DOUBLE PRECISION NOT NULL,
  "priceUsd"       DOUBLE PRECISION NOT NULL,
  "priceFiat"      DOUBLE PRECISION NOT NULL,
  "fxRate"         DOUBLE PRECISION NOT NULL,
  "serviceFee"     DOUBLE PRECISION NOT NULL,
  "networkFee"     DOUBLE PRECISION NOT NULL,
  "paycrivoFee"    DOUBLE PRECISION NOT NULL,
  "totalFees"      DOUBLE PRECISION NOT NULL,
  "netAmount"      DOUBLE PRECISION NOT NULL,
  "receiveAmount"  DOUBLE PRECISION NOT NULL,
  "firstPurchase"  BOOLEAN NOT NULL DEFAULT TRUE,
  "priceStatus"    TEXT NOT NULL,
  "consumed"       BOOLEAN NOT NULL DEFAULT FALSE,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consumedOrderId" TEXT
);
CREATE INDEX "quotes_sessionKey_idx" ON "quotes"("sessionKey");
CREATE INDEX "quotes_userId_idx" ON "quotes"("userId");
CREATE INDEX "quotes_expiresAt_idx" ON "quotes"("expiresAt");

ALTER TABLE "orders" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "orders" ADD COLUMN "sessionKey"     TEXT;
ALTER TABLE "orders" ADD COLUMN "quoteId"        TEXT;
ALTER TABLE "orders" ADD COLUMN "priceUsd"       DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "priceFiat"      DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "fxRate"         DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "serviceFee"     DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "networkFee"     DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "paycrivoFee"    DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "totalFees"      DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "netAmount"      DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN "priceStatus"    TEXT;

CREATE UNIQUE INDEX "orders_owner_idempotency_uidx"
  ON "orders"(COALESCE("userId", "sessionKey"), "idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;