-- CreateTable
CREATE TABLE "SocialEventReceipt" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "webhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialEventReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialEventReceipt_platform_providerAccountId_eventType_providerEventId_key"
ON "SocialEventReceipt"("platform", "providerAccountId", "eventType", "providerEventId");

-- CreateIndex
CREATE INDEX "SocialEventReceipt_workspaceId_idx" ON "SocialEventReceipt"("workspaceId");

-- CreateIndex
CREATE INDEX "SocialEventReceipt_providerAccountId_idx" ON "SocialEventReceipt"("providerAccountId");

-- CreateIndex
CREATE INDEX "SocialEventReceipt_createdAt_idx" ON "SocialEventReceipt"("createdAt");

-- AddForeignKey
ALTER TABLE "SocialEventReceipt" ADD CONSTRAINT "SocialEventReceipt_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
