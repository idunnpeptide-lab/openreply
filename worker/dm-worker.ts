import { createDMWorker } from "@/lib/queue/dm-worker";
import { createTikTokIngressWorker } from "@/lib/queue/tiktok-ingress";
import { recordWorkerHeartbeat } from "@/lib/ops/worker-health";
import { reconcileComments } from "@/lib/polling/comment-reconciler";
import os from "node:os";

const dmWorker = createDMWorker();
const tiktokIngressWorker = createTikTokIngressWorker();
const startedAt = new Date().toISOString();
const HEARTBEAT_INTERVAL_MS = 30_000;
// Polling safety net for Instagram comments that webhooks miss. TikTok remains
// webhook-only until its provider-specific polling semantics are validated.
const POLL_INTERVAL_MS = Number(
  process.env.COMMENT_POLL_INTERVAL_MS ?? 5 * 60_000
);

console.log("[DM Worker] Started");
console.log("[TikTok Ingress] Started");

async function heartbeat() {
  try {
    await recordWorkerHeartbeat({
      pid: process.pid,
      hostname: os.hostname(),
      startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Heartbeat failed:", message);
  }
}

void heartbeat();
const heartbeatTimer = setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);

async function poll() {
  try {
    await reconcileComments();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Comment reconciliation failed:", message);
  }
}

// Kick off one Instagram reconciliation sweep shortly after boot, then on a
// fixed interval.
setTimeout(() => void poll(), 10_000);
const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);

async function shutdown(signal: string) {
  console.log(`[Workers] ${signal} received, closing workers`);
  clearInterval(heartbeatTimer);
  clearInterval(pollTimer);
  await Promise.all([dmWorker.close(), tiktokIngressWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
