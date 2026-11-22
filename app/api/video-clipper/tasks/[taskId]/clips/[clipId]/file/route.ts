import { NextRequest, NextResponse } from "next/server";
import { getSupoClipFile } from "@/lib/video-clipper/supoclip";
import { getOwnedVideoClipperTask, requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string; clipId: string }> }
) {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const { taskId, clipId } = await context.params;
    const local = await getOwnedVideoClipperTask(taskId, workspaceId);
    const upstream = await getSupoClipFile(local.engineTaskId, clipId);

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "video/mp4");
    headers.set("Cache-Control", "private, max-age=300");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    const download = request.nextUrl.searchParams.get("download") === "1";
    headers.set(
      "Content-Disposition",
      download
        ? `attachment; filename="replyhalo-clip-${clipId}.mp4"`
        : upstream.headers.get("content-disposition") || `inline; filename="replyhalo-clip-${clipId}.mp4"`
    );

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_stream_clip";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (message === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
