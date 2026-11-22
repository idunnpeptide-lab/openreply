import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { refreshSupoClipUploadParts } from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const body = await request.json().catch(() => ({})) as {
      video_path?: unknown; uploadId?: unknown; partNumbers?: unknown;
    };
    const sourcePath = typeof body.video_path === "string" ? body.video_path : "";
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    const partNumbers = Array.isArray(body.partNumbers)
      ? body.partNumbers.filter((n): n is number => Number.isInteger(n) && n > 0).slice(0, 3)
      : [];
    if (!sourcePath || !uploadId || !partNumbers.length) {
      return NextResponse.json({ error: "invalid_upload_request" }, { status: 400 });
    }
    const owned = await prisma.videoClipperUpload.findFirst({ where: { sourcePath, workspaceId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = await refreshSupoClipUploadParts({ video_path: sourcePath, uploadId, partNumbers });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_parts_failed";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
