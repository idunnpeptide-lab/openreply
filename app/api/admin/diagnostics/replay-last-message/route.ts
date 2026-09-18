import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getBaseUrl } from "@/lib/env";
import { parseMessageEvents } from "@/lib/meta/webhook";
import { getDMQueue, MESSAGE_JOB_NAME } from "@/lib/queue/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isStagingDeployment() {
  try {
    return new URL(getBaseUrl()).hostname.toLowerCase().includes("staging");
  } catch {
    return false;
  }
}

export async function POST() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 }
    );
  }

  // This endpoint exists only to prove webhook replay idempotency during staging QA.
  // Never expose a replay action on a production customer deployment.
  if (!isStagingDeployment()) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  const webhookEvents = await prisma.webhookEvent.findMany({
    where: {
      workspaceId: context.workspaceId,
      status: "PROCESSED",
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      payload: true,
      createdAt: true,
    },
  });

  let candidate:
    | {
        webhookEventId: string;
        createdAt: Date;
        event: ReturnType<typeof parseMessageEvents>[number];
      }
    | null = null;

  for (const webhookEvent of webhookEvents) {
    const parsed = parseMessageEvents(
      webhookEvent.payload as unknown as Parameters<typeof parseMessageEvents>[0]
    );
    if (parsed.length > 0) {
      candidate = {
        webhookEventId: webhookEvent.id,
        createdAt: webhookEvent.createdAt,
        event: parsed[0],
      };
      break;
    }
  }

  if (!candidate) {
    return NextResponse.json(
      {
        success: false,
        error: "No recent inbound Instagram DM webhook found for this workspace",
      },
      { status: 404 }
    );
  }

  const jobId = `message_${candidate.event.instagramAccountId}_${Buffer.from(
    candidate.event.messageId
  ).toString("base64url")}`;

  const queue = getDMQueue();
  const existing = await queue.getJob(jobId);

  // Replaying without the original retained job could genuinely enqueue a new DM.
  // Refuse instead of risking a duplicate message to the test user.
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        safeToReplay: false,
        error:
          "Original queue job is no longer retained; replay was not attempted to avoid a duplicate DM",
        jobId,
        webhookEventId: candidate.webhookEventId,
      },
      { status: 409 }
    );
  }

  const beforeState = await existing.getState();
  if (beforeState !== "completed") {
    return NextResponse.json(
      {
        success: false,
        safeToReplay: false,
        error: `Original job is ${beforeState}; replay requires a completed retained job`,
        jobId,
        webhookEventId: candidate.webhookEventId,
      },
      { status: 409 }
    );
  }

  const before = {
    id: existing.id,
    state: beforeState,
    timestamp: existing.timestamp,
    processedOn: existing.processedOn ?? null,
    finishedOn: existing.finishedOn ?? null,
    attemptsMade: existing.attemptsMade,
  };

  // Intentionally add the exact same Meta message event with the exact same
  // deterministic job id used by the live webhook route. BullMQ should return
  // the retained job rather than scheduling another worker execution.
  await queue.add(
    MESSAGE_JOB_NAME,
    {
      instagramAccountId: candidate.event.instagramAccountId,
      messageId: candidate.event.messageId,
      messageText: candidate.event.messageText,
      senderId: candidate.event.senderId,
    },
    { jobId }
  );

  const afterJob = await queue.getJob(jobId);
  const afterState = afterJob ? await afterJob.getState() : "missing";
  const after = afterJob
    ? {
        id: afterJob.id,
        state: afterState,
        timestamp: afterJob.timestamp,
        processedOn: afterJob.processedOn ?? null,
        finishedOn: afterJob.finishedOn ?? null,
        attemptsMade: afterJob.attemptsMade,
      }
    : null;

  const deduped = Boolean(
    after &&
      after.id === before.id &&
      after.state === "completed" &&
      after.timestamp === before.timestamp &&
      after.processedOn === before.processedOn &&
      after.finishedOn === before.finishedOn &&
      after.attemptsMade === before.attemptsMade
  );

  return NextResponse.json({
    success: true,
    deduped,
    safeToReplay: true,
    jobId,
    webhookEventId: candidate.webhookEventId,
    webhookCreatedAt: candidate.createdAt,
    before,
    after,
  });
}
