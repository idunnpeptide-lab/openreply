CREATE TABLE "VideoClipperUpload" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT,
  "sizeBytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VideoClipperUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoClipperUpload_sourcePath_key" ON "VideoClipperUpload"("sourcePath");
CREATE INDEX "VideoClipperUpload_workspaceId_idx" ON "VideoClipperUpload"("workspaceId");
CREATE INDEX "VideoClipperUpload_createdByUserId_idx" ON "VideoClipperUpload"("createdByUserId");
CREATE INDEX "VideoClipperUpload_createdAt_idx" ON "VideoClipperUpload"("createdAt");

ALTER TABLE "VideoClipperUpload"
ADD CONSTRAINT "VideoClipperUpload_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
