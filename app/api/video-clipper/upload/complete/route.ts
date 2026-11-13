import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { completeSupoClipUpload } from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const body = await request.json().catch(() => ({})) as {
      video_path?: unknown;
      uploadId?: unknown;
      parts?: unknown;
    };
    const sourcePath = typeof body.video_path === "string" ? body.video_path : "";
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    const parts = Array.isArray(body.parts)
      ? body.parts.flatMap((part) => {
          if (!part || typeof part !== "object") return [];
          const p = part as { partNumber?: unknown; etag?: unknown };
          return Number.isInteger(p.partNumber) && Number(p.partNumber) > 0 && typeof p.etag === "string" && p.etag
            ? [{ partNumber: Number(p.partNumber), etag: p.etag }]
            : [];
        })
      : [];
    if (!sourcePath || !uploadId || !parts.length) {
      return NextResponse.json({ error: "invalid_upload_request" }, { status: 400 });
    }
    const owned = await prisma.videoClipperUpload.findFirst({ where: { sourcePath, workspaceId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = await completeSupoClipUpload({ video_path: sourcePath, uploadId, parts });
    if (result.video_path && result.video_path !== sourcePath) {
      await prisma.videoClipperUpload.update({ where: { id: owned.id }, data: { sourcePath: result.video_path } });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_complete_failed";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
