CREATE TYPE "CicloCobranca" AS ENUM ('MONTHLY', 'SEMIANNUALLY', 'ANNUALLY');
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

ALTER TABLE "Tenant"
  ADD COLUMN "abacateCustomerId" TEXT,
  ADD COLUMN "abacateSubscriptionId" TEXT,
  ADD COLUMN "billingCycle" "CicloCobranca",
  ADD COLUMN "billingCurrentPeriodEnd" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "privacyVersion" TEXT;

CREATE TABLE "BillingProduct" (
  "id" TEXT NOT NULL,
  "providerProductId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "plan" "PlanoSaas" NOT NULL,
  "cycle" "CicloCobranca" NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "devMode" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingCheckout" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "plan" "PlanoSaas" NOT NULL,
  "cycle" "CicloCobranca" NOT NULL,
  "providerCheckoutId" TEXT,
  "checkoutUrl" TEXT,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerSubscriptionId" TEXT,
  "tenantId" TEXT,
  "devMode" BOOLEAN NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_abacateCustomerId_key" ON "Tenant"("abacateCustomerId");
CREATE UNIQUE INDEX "Tenant_abacateSubscriptionId_key" ON "Tenant"("abacateSubscriptionId");
CREATE UNIQUE INDEX "BillingProduct_providerProductId_key" ON "BillingProduct"("providerProductId");
CREATE UNIQUE INDEX "BillingProduct_externalId_key" ON "BillingProduct"("externalId");
CREATE UNIQUE INDEX "BillingProduct_plan_cycle_devMode_key" ON "BillingProduct"("plan", "cycle", "devMode");
CREATE INDEX "BillingProduct_active_idx" ON "BillingProduct"("active");
CREATE UNIQUE INDEX "BillingCheckout_providerCheckoutId_key" ON "BillingCheckout"("providerCheckoutId");
CREATE INDEX "BillingCheckout_tenantId_status_createdAt_idx" ON "BillingCheckout"("tenantId", "status", "createdAt");
CREATE INDEX "BillingWebhookEvent_tenantId_idx" ON "BillingWebhookEvent"("tenantId");
CREATE INDEX "BillingWebhookEvent_eventType_idx" ON "BillingWebhookEvent"("eventType");
CREATE INDEX "BillingWebhookEvent_processedAt_idx" ON "BillingWebhookEvent"("processedAt");

ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
