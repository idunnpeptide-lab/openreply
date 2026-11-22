CREATE TABLE "VideoClipperTask" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "engineTaskId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "workflow" TEXT NOT NULL DEFAULT 'highlights',
  "clipLength" TEXT NOT NULL DEFAULT 'auto',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "progressMessage" TEXT,
  "errorCode" TEXT,
  "title" TEXT,
  "clipsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VideoClipperTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoClipperTask_engineTaskId_key" ON "VideoClipperTask"("engineTaskId");
CREATE INDEX "VideoClipperTask_workspaceId_idx" ON "VideoClipperTask"("workspaceId");
CREATE INDEX "VideoClipperTask_createdByUserId_idx" ON "VideoClipperTask"("createdByUserId");
CREATE INDEX "VideoClipperTask_status_idx" ON "VideoClipperTask"("status");
CREATE INDEX "VideoClipperTask_createdAt_idx" ON "VideoClipperTask"("createdAt");

ALTER TABLE "VideoClipperTask"
ADD CONSTRAINT "VideoClipperTask_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
