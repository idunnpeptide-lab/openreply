import { Job, Queue, Worker } from "bullmq";
import { prisma } from "@/lib/db/client";
import {
  getDmMagnetLicenseServerConfig,
  validateDmMagnetWorkspaceLicense,
} from "@/lib/dm-magnet-license";
import { getRedisConnection } from "@/lib/queue/client";
import { parseTikTokCommentUpdateContent } from "@/lib/tiktok/comment-webhook";
import { getTikTokCommentById } from "@/lib/tiktok/comment-lookup";
import { normalizeTikTokCommentEvent } from "@/lib/tiktok/client";

export const TIKTOK_COMMENT_INGRESS_JOB = "process-tiktok-comment-webhook";

export type TikTokCommentIngressJob = {
  webhookEventId: string;
  workspaceId: string;
  tiktokAccountId: string;
  businessId: string;
  contentRaw: string;
};

let queue: Queue<TikTokCommentIngressJob> | null = null;

export function getTikTokIngressQueue() {
  if (!queue) {
    queue = new Queue<TikTokCommentIngressJob>("tiktok-ingress", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { age: 3600, count: 2000 },
      },
    });
  }
  return queue;
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

  if (getDmMagnetLicenseServerConfig()) {
    await validateDmMagnetWorkspaceLicense(workspaceId);
  }

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

  // This is the provider-neutral handoff point. Until TikTok campaign storage
  // and live app approval are complete, persist the normalized event as an
  // operational record rather than allowing it to enter Instagram automation
  // code paths.
  await prisma.$transaction([
    prisma.operationalEvent.create({
      data: {
        workspaceId,
        source: "WORKER",
        level: "INFO",
        message: "TikTok comment normalized and ready for automation routing",
        payload: {
          webhookEventId,
          ...normalized,
        },
      },
    }),
    prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    }),
  ]);
}

async function recordTikTokIngressFailure(
  job: Job<TikTokCommentIngressJob> | undefined,
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
          message: `TikTok comment ingress failed: ${error.message}`,
          payload: {
            webhookEventId: job.data.webhookEventId,
            tiktokAccountId: job.data.tiktokAccountId,
            attemptsMade: job.attemptsMade,
          },
        },
      })
      .catch(() => {}),
  ]);
}

export function createTikTokIngressWorker() {
  const worker = new Worker<TikTokCommentIngressJob>(
    "tiktok-ingress",
    async (job) => {
      if (job.name !== TIKTOK_COMMENT_INGRESS_JOB) return;
      await processTikTokCommentIngress(job);
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
