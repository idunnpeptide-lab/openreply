import { Queue, Worker, type Job } from "bullmq";
import { prisma } from "@/lib/db/client";
import {
  getDmMagnetLicenseServerConfig,
  validateDmMagnetWorkspaceLicense,
} from "@/lib/dm-magnet-license";
import { getRedisConnection } from "@/lib/queue/client";
import { persistSocialEventHandoff } from "@/lib/social-event-receipts";
import {
  routeTikTokCommentAutomation,
  routeTikTokMessageAutomation,
} from "@/lib/tiktok/automation-routing";
import { parseTikTokCommentUpdateContent } from "@/lib/tiktok/comment-webhook";
import { getTikTokCommentById } from "@/lib/tiktok/comment-lookup";
import { normalizeTikTokCommentEvent } from "@/lib/tiktok/client";
import { resolveTikTokEuInboundMessage } from "@/lib/tiktok/eu-message-sync";
import {
  normalizeTikTokInboundMessageEvent,
  parseTikTokEuInboundMessageContent,
  parseTikTokInboundMessageContent,
} from "@/lib/tiktok/message-webhook";

export const TIKTOK_COMMENT_INGRESS_JOB = "process-tiktok-comment-webhook";
export const TIKTOK_MESSAGE_INGRESS_JOB = "process-tiktok-message-webhook";
export const TIKTOK_EU_MESSAGE_SYNC_JOB = "sync-tiktok-eu-message-webhook";

export type TikTokCommentIngressJob = {
  webhookEventId: string;
  workspaceId: string;
  tiktokAccountId: string;
  businessId: string;
  contentRaw: string;
};

export type TikTokMessageIngressJob = {
  webhookEventId: string;
  workspaceId: string;
  tiktokAccountId: string;
  businessId: string;
  contentRaw: string;
};

export type TikTokEuMessageSyncJob = TikTokMessageIngressJob;

export type TikTokIngressJob =
  | TikTokCommentIngressJob
  | TikTokMessageIngressJob
  | TikTokEuMessageSyncJob;

let queue: Queue<TikTokIngressJob> | null = null;

export function getTikTokIngressQueue() {
  if (!queue) {
    queue = new Queue<TikTokIngressJob>("tiktok-ingress", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 1000 },
        // Failure detail is durable in WebhookEvent + OperationalEvent. Remove
        // the terminal BullMQ job so a provider retry can enqueue the same
        // deterministic delivery again after a transient outage is fixed.
        removeOnFail: true,
      },
    });
  }
  return queue;
}

async function validateWorkspaceLicense(workspaceId: string) {
  if (getDmMagnetLicenseServerConfig()) {
    await validateDmMagnetWorkspaceLicense(workspaceId);
  }
}

export async function processTikTokCommentIngress(
  job: Job<TikTokCommentIngressJob>
) {
  const {
    webhookEventId,
    workspaceId,
    tiktokAccountId,
    businessId,
    contentRaw,
  } = job.data;

  await validateWorkspaceLicense(workspaceId);

  const update = parseTikTokCommentUpdateContent(contentRaw);

  // Deletions and visibility changes matter for future analytics/moderation, but
  // they must never trigger a keyword automation. Mark them consumed for now.
  if (update.commentAction !== "insert") {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    return;
  }

  const comment = await getTikTokCommentById({
    tiktokAccountId,
    videoId: update.videoId,
    commentId: update.commentId,
  });

  if (!comment) {
    throw new Error(
      `TikTok comment ${update.commentId} was not returned by the comment lookup API`
    );
  }

  const normalized = normalizeTikTokCommentEvent({
    businessId,
    fallbackVideoId: update.videoId,
    comment,
  });

  if (!normalized) {
    throw new Error(
      `TikTok comment ${update.commentId} could not be normalized safely`
    );
  }

  await persistSocialEventHandoff({
    workspaceId,
    platform: "TIKTOK",
    providerAccountId: tiktokAccountId,
    eventType: "COMMENT_INSERT",
    providerEventId: normalized.commentId,
    webhookEventId,
    operationalMessage: "TikTok comment normalized and ready for automation routing",
    normalizedPayload: { ...normalized },
  });

  // Route after the durable provider receipt exists. Routing is itself
  // idempotent per automation + provider event, so an ingress retry after the
  // receipt transaction committed can safely repair a failed routing attempt.
  await routeTikTokCommentAutomation({
    workspaceId,
    tiktokAccountId,
    event: normalized,
  });
}

export async function processTikTokMessageIngress(
  job: Job<TikTokMessageIngressJob>
) {
  const {
    webhookEventId,
    workspaceId,
    tiktokAccountId,
    businessId,
    contentRaw,
  } = job.data;

  await validateWorkspaceLicense(workspaceId);

  const message = parseTikTokInboundMessageContent(contentRaw);
  const normalized = normalizeTikTokInboundMessageEvent({
    businessId,
    message,
  });

  // Non-text payloads (images, reactions, stickers, templates, etc.) are valid
  // inbound messages but cannot safely enter keyword matching.
  if (!normalized) {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
    return;
  }

  await persistSocialEventHandoff({
    workspaceId,
    platform: "TIKTOK",
    providerAccountId: tiktokAccountId,
    eventType: "MESSAGE_INBOUND",
    providerEventId: normalized.messageId,
    webhookEventId,
    operationalMessage:
      "TikTok inbound message normalized and ready for automation routing",
    normalizedPayload: { ...normalized },
  });

  await routeTikTokMessageAutomation({
    workspaceId,
    tiktokAccountId,
    event: normalized,
  });
}

export async function processTikTokEuMessageSync(
  job: Job<TikTokEuMessageSyncJob>
) {
  const {
    webhookEventId,
    workspaceId,
    tiktokAccountId,
    businessId,
    contentRaw,
  } = job.data;

  await validateWorkspaceLicense(workspaceId);

  const stripped = parseTikTokEuInboundMessageContent(contentRaw);
  const normalized = await resolveTikTokEuInboundMessage({
    tiktokAccountId,
    businessId,
    timestamp: stripped.timestamp,
  });

  // Use the same provider event type as the full webhook path. If TikTok ever
  // exposes the same message through both forms, the stable provider message id
  // prevents a second automation handoff.
  await persistSocialEventHandoff({
    workspaceId,
    platform: "TIKTOK",
    providerAccountId: tiktokAccountId,
    eventType: "MESSAGE_INBOUND",
    providerEventId: normalized.messageId,
    webhookEventId,
    operationalMessage:
      "TikTok EU inbound message resolved and ready for automation routing",
    normalizedPayload: { ...normalized },
  });

  await routeTikTokMessageAutomation({
    workspaceId,
    tiktokAccountId,
    event: normalized,
  });
}

async function recordTikTokIngressFailure(
  job: Job<TikTokIngressJob> | undefined,
  error: Error
) {
  if (!job) return;
  const finalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1);
  if (!finalAttempt) return;

  await Promise.all([
    prisma.webhookEvent
      .update({
        where: { id: job.data.webhookEventId },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          errorMessage: error.message.slice(0, 1000),
        },
      })
      .catch(() => {}),
    prisma.operationalEvent
      .create({
        data: {
          workspaceId: job.data.workspaceId,
          source: "WORKER",
          level: "ERROR",
          message: `TikTok ingress failed: ${error.message}`,
          payload: {
            webhookEventId: job.data.webhookEventId,
            tiktokAccountId: job.data.tiktokAccountId,
            jobName: job.name,
            attemptsMade: job.attemptsMade,
          },
        },
      })
      .catch(() => {}),
  ]);
}

export function createTikTokIngressWorker() {
  const worker = new Worker<TikTokIngressJob>(
    "tiktok-ingress",
    async (job) => {
      if (job.name === TIKTOK_COMMENT_INGRESS_JOB) {
        return processTikTokCommentIngress(
          job as Job<TikTokCommentIngressJob>
        );
      }
      if (job.name === TIKTOK_MESSAGE_INGRESS_JOB) {
        return processTikTokMessageIngress(
          job as Job<TikTokMessageIngressJob>
        );
      }
      if (job.name === TIKTOK_EU_MESSAGE_SYNC_JOB) {
        return processTikTokEuMessageSync(
          job as Job<TikTokEuMessageSyncJob>
        );
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[TikTok Ingress] Job ${job.id} completed`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[TikTok Ingress] Job ${job?.id} failed:`, error.message);
    void recordTikTokIngressFailure(job, error);
  });
  worker.on("error", (error) => {
    console.error("[TikTok Ingress] Worker error:", error.message);
  });

  return worker;
}
