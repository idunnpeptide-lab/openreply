-- CreateTable
CREATE TABLE "TikTokAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "commentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messagingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commentToMessageEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookConfigured" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokAccount_openId_key" ON "TikTokAccount"("openId");

-- CreateIndex
CREATE INDEX "TikTokAccount_workspaceId_idx" ON "TikTokAccount"("workspaceId");

-- AddForeignKey
ALTER TABLE "TikTokAccount" ADD CONSTRAINT "TikTokAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
