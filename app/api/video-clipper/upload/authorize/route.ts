import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { authorizeSupoClipUpload } from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";
const MAX_UPLOAD_BYTES = 4_000_000_000;

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await requireVideoClipperContext();
    const body = await request.json().catch(() => ({})) as {
      filename?: unknown; size?: unknown; contentType?: unknown;
    };
    const filename = typeof body.filename === "string" ? body.filename.trim().slice(0, 255) : "";
    const size = typeof body.size === "number" ? body.size : Number(body.size);
    const contentType = typeof body.contentType === "string" ? body.contentType.trim().slice(0, 128) : "application/octet-stream";
    if (!filename || !Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "invalid_upload" }, { status: 400 });
    }

    const authorization = await authorizeSupoClipUpload({ filename, size, contentType });
    if (!authorization.video_path || !authorization.uploadId) {
      return NextResponse.json({ error: "invalid_upload_authorization" }, { status: 502 });
    }

    await prisma.videoClipperUpload.upsert({
      where: { sourcePath: authorization.video_path },
      create: {
        workspaceId,
        createdByUserId: userId,
        sourcePath: authorization.video_path,
        filename,
        contentType,
        sizeBytes: BigInt(size),
      },
      update: {
        workspaceId,
        createdByUserId: userId,
        filename,
        contentType,
        sizeBytes: BigInt(size),
      },
    });

    return NextResponse.json(authorization, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload_authorize_failed";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
