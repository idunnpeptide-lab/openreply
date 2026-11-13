import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSupoClipClips, getSupoClipTask } from "@/lib/video-clipper/supoclip";
import {
  getOwnedVideoClipperTask,
  normalizeEngineProgress,
  normalizeEngineStatus,
  requireVideoClipperContext,
} from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const { taskId } = await context.params;
    const local = await getOwnedVideoClipperTask(taskId, workspaceId);
    const engine = await getSupoClipTask(local.engineTaskId);

    const status = normalizeEngineStatus(engine.status);
    const progress = normalizeEngineProgress(engine.progress);
    const progressMessage =
      typeof engine.progress_message === "string" ? engine.progress_message : null;
    const errorCode = typeof engine.error_code === "string" ? engine.error_code : null;
    const title = typeof engine.source_title === "string" ? engine.source_title : local.title;
    const clipsCount =
      typeof engine.clips_count === "number" ? engine.clips_count : local.clipsCount;

    const updated = await prisma.videoClipperTask.update({
      where: { id: local.id },
      data: { status, progress, progressMessage, errorCode, title, clipsCount },
    });

    let clips: unknown[] = [];
    if (["completed", "complete", "done"].includes(status.toLowerCase())) {
      clips = await getSupoClipClips(local.engineTaskId);
    }

    return NextResponse.json({ task: updated, engine, clips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_get_video_task";
    if (message === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (message === "NOT_FOUND") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
