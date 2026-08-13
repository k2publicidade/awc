-- Complete the SaaS fields that predate the migration history in this database.
CREATE TYPE "PlanoSaas" AS ENUM ('STARTER', 'PRO', 'BUSINESS');
CREATE TYPE "AssinaturaStatus" AS ENUM ('TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA');

-- Work codes must be unique per customer, not across the entire RIGOR platform.
DROP INDEX "Obra_codigo_key";

ALTER TABLE "Tenant"
  ADD COLUMN "billingEmail" TEXT,
  ADD COLUMN "document" TEXT,
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "plan" "PlanoSaas" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStatus" "AssinaturaStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trialEndsAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Obra_tenantId_codigo_key" ON "Obra"("tenantId", "codigo");
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");
CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
