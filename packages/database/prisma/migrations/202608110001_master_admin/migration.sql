-- Create the isolated RIGOR platform role.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MASTER_ADMIN';

-- Separate platform workspaces from customer companies and allow a company to
-- be suspended without deleting its operational history.
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Force temporary-password rotation and support platform activity reports.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Immutable audit trail for sensitive MASTER ADMIN operations.
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "tenantId" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actorId_fkey') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_tenantId_fkey') THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
