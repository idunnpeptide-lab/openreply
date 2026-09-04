-- Add workspace-scoped DM Magnet licensing without changing existing Workspace columns.
CREATE TABLE "DmMagnetWorkspaceLicense" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "licenseKeyEncrypted" TEXT NOT NULL,
  "licenseKeyHash" TEXT NOT NULL,
  "licenseKeyPrefix" TEXT NOT NULL,
  "configuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DmMagnetWorkspaceLicense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DmMagnetWorkspaceLicense_workspaceId_key"
ON "DmMagnetWorkspaceLicense"("workspaceId");

CREATE UNIQUE INDEX "DmMagnetWorkspaceLicense_licenseKeyHash_key"
ON "DmMagnetWorkspaceLicense"("licenseKeyHash");

CREATE INDEX "DmMagnetWorkspaceLicense_workspaceId_idx"
ON "DmMagnetWorkspaceLicense"("workspaceId");

ALTER TABLE "DmMagnetWorkspaceLicense"
ADD CONSTRAINT "DmMagnetWorkspaceLicense_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
