-- Store one encrypted DM Magnet License Key per customer workspace.
ALTER TABLE "Workspace"
ADD COLUMN "dmMagnetLicenseKeyEncrypted" TEXT,
ADD COLUMN "dmMagnetLicenseKeyHash" TEXT,
ADD COLUMN "dmMagnetLicenseKeyPrefix" TEXT,
ADD COLUMN "dmMagnetLicenseConfiguredAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Workspace_dmMagnetLicenseKeyHash_key"
ON "Workspace"("dmMagnetLicenseKeyHash");
