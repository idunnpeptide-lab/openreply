-- Additive TikTok campaign storage. Existing Instagram Automation/DmLog tables
-- are intentionally untouched until TikTok passes its own live staging QA.
CREATE TYPE "TikTokAutomationMatchStatus" AS ENUM ('MATCHED', 'EXECUTED', 'FAILED', 'SKIPPED');

CREATE TABLE "TikTokAutomation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tiktokAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "videoId" TEXT,
    "matchAnyVideo" BOOLEAN NOT NULL DEFAULT false,
    "commentTriggerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messageTriggerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchAnyWord" BOOLEAN NOT NULL DEFAULT false,
    "wholeWordMatch" BOOLEAN NOT NULL DEFAULT true,
    "publicReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicReplyMessage" TEXT,
    "dmReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dmMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokAutomation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TikTokAutomationMatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tiktokAccountId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "matchedKeyword" TEXT,
    "inputText" TEXT NOT NULL,
    "contentId" TEXT,
    "conversationId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorUsername" TEXT,
    "plan" JSONB NOT NULL,
    "status" "TikTokAutomationMatchStatus" NOT NULL DEFAULT 'MATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokAutomationMatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TikTokAutomation_workspaceId_idx" ON "TikTokAutomation"("workspaceId");
CREATE INDEX "TikTokAutomation_tiktokAccountId_idx" ON "TikTokAutomation"("tiktokAccountId");
CREATE INDEX "TikTokAutomation_videoId_idx" ON "TikTokAutomation"("videoId");
CREATE INDEX "TikTokAutomation_isActive_idx" ON "TikTokAutomation"("isActive");

CREATE UNIQUE INDEX "TikTokAutomationMatch_automationId_eventType_providerEventId_key"
ON "TikTokAutomationMatch"("automationId", "eventType", "providerEventId");
CREATE INDEX "TikTokAutomationMatch_workspaceId_idx" ON "TikTokAutomationMatch"("workspaceId");
CREATE INDEX "TikTokAutomationMatch_tiktokAccountId_idx" ON "TikTokAutomationMatch"("tiktokAccountId");
CREATE INDEX "TikTokAutomationMatch_automationId_idx" ON "TikTokAutomationMatch"("automationId");
CREATE INDEX "TikTokAutomationMatch_eventType_providerEventId_idx" ON "TikTokAutomationMatch"("eventType", "providerEventId");
CREATE INDEX "TikTokAutomationMatch_status_idx" ON "TikTokAutomationMatch"("status");
CREATE INDEX "TikTokAutomationMatch_createdAt_idx" ON "TikTokAutomationMatch"("createdAt");

ALTER TABLE "TikTokAutomation"
ADD CONSTRAINT "TikTokAutomation_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TikTokAutomation"
ADD CONSTRAINT "TikTokAutomation_tiktokAccountId_fkey"
FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TikTokAutomationMatch"
ADD CONSTRAINT "TikTokAutomationMatch_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TikTokAutomationMatch"
ADD CONSTRAINT "TikTokAutomationMatch_tiktokAccountId_fkey"
FOREIGN KEY ("tiktokAccountId") REFERENCES "TikTokAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TikTokAutomationMatch"
ADD CONSTRAINT "TikTokAutomationMatch_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "TikTokAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
