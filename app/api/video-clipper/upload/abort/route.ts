import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { abortSupoClipUpload } from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const body = await request.json().catch(() => ({})) as { video_path?: unknown; uploadId?: unknown };
    const sourcePath = typeof body.video_path === "string" ? body.video_path : "";
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    if (!sourcePath || !uploadId) return NextResponse.json({ error: "invalid_upload_request" }, { status: 400 });
    const owned = await prisma.videoClipperUpload.findFirst({ where: { sourcePath, workspaceId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const result = await abortSupoClipUpload({ video_path: sourcePath, uploadId }).catch(() => ({ message: "aborted" }));
    await prisma.videoClipperUpload.delete({ where: { id: owned.id } }).catch(() => undefined);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_abort_failed";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
