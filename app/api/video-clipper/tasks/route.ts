import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  createSupoClipTask,
  type SupoClipClipLength,
  type SupoClipWorkflow,
} from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

const WORKFLOWS = new Set(["highlights", "series", "topic", "recap", "trailer"]);
const LENGTHS = new Set(["auto", "short", "medium", "long"]);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { workspaceId } = await requireVideoClipperContext();
    const tasks = await prisma.videoClipperTask.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "failed_to_list_tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workspaceId } = await requireVideoClipperContext();
    const body = await request.json().catch(() => ({})) as {
      sourceUrl?: unknown;
      workflow?: unknown;
      clipLength?: unknown;
      topic?: unknown;
      instructions?: unknown;
    };

    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    if (!sourceUrl) {
      return NextResponse.json({ error: "source_url_required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return NextResponse.json({ error: "invalid_source_url" }, { status: 400 });
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "invalid_source_url" }, { status: 400 });
    }

    const workflowRaw = typeof body.workflow === "string" ? body.workflow : "highlights";
    const clipLengthRaw = typeof body.clipLength === "string" ? body.clipLength : "auto";
    if (!WORKFLOWS.has(workflowRaw) || !LENGTHS.has(clipLengthRaw)) {
      return NextResponse.json({ error: "invalid_video_clipper_options" }, { status: 400 });
    }

    const workflow = workflowRaw as SupoClipWorkflow;
    const clipLength = clipLengthRaw as SupoClipClipLength;
    const topic = typeof body.topic === "string" ? body.topic.trim() : undefined;
    const instructions = typeof body.instructions === "string" ? body.instructions.trim() : undefined;

    if (workflow === "topic" && !topic) {
      return NextResponse.json({ error: "topic_required" }, { status: 400 });
    }

    const engine = await createSupoClipTask({
      sourceUrl,
      workflow,
      clipLength,
      topic,
      instructions,
    });

    if (!engine.id) {
      return NextResponse.json({ error: "engine_task_missing_id" }, { status: 502 });
    }

    const local = await prisma.videoClipperTask.create({
      data: {
        workspaceId,
        createdByUserId: userId,
        engineTaskId: engine.id,
        sourceUrl,
        workflow,
        clipLength,
        status: typeof engine.status === "string" ? engine.status : "queued",
        progress: typeof engine.progress === "number" ? Math.round(engine.progress) : 0,
        progressMessage: typeof engine.progress_message === "string" ? engine.progress_message : null,
        errorCode: typeof engine.error_code === "string" ? engine.error_code : null,
        title: typeof engine.source_title === "string" ? engine.source_title : null,
        clipsCount: typeof engine.clips_count === "number" ? engine.clips_count : 0,
      },
    });

    return NextResponse.json({ task: local }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed_to_create_video_task";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "video_engine_error", detail: message }, { status: 502 });
  }
}
