import { refreshExpiringInstagramTokens } from "@/lib/instagram/token-refresh";
import { recordWorkerHeartbeat } from "@/lib/ops/worker-health";
import { reconcileComments } from "@/lib/polling/comment-reconciler";
import { createDMWorker } from "@/lib/queue/dm-worker";
import { createTikTokIngressWorker } from "@/lib/queue/tiktok-ingress";
import os from "node:os";

const dmWorker = createDMWorker();
const tiktokIngressWorker = createTikTokIngressWorker();
const startedAt = new Date().toISOString();
const HEARTBEAT_INTERVAL_MS = 30_000;
const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
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
const pollStartupTimer = setTimeout(() => void poll(), 10_000);
const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);

let tokenRefreshInFlight = false;

async function refreshInstagramTokens() {
  if (tokenRefreshInFlight) return;
  tokenRefreshInFlight = true;

  try {
    const result = await refreshExpiringInstagramTokens();
    if (result.totalProcessed > 0) {
      console.log(
        `[DM Worker] Instagram token refresh processed ${result.totalProcessed}: ${result.refreshed} refreshed, ${result.failed} failed`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM Worker] Instagram token refresh sweep failed:", message);
  } finally {
    tokenRefreshInFlight = false;
  }
}

// Railway runs the long-lived worker continuously, so keep token refresh inside
// the worker instead of depending on Vercel-only cron configuration. The sweep
// starts shortly after boot and then runs twice per day. Only tokens within the
// refresh window are actually sent to Meta.
const tokenRefreshStartupTimer = setTimeout(
  () => void refreshInstagramTokens(),
  30_000
);
const tokenRefreshTimer = setInterval(
  () => void refreshInstagramTokens(),
  TOKEN_REFRESH_INTERVAL_MS
);

async function shutdown(signal: string) {
  console.log(`[Workers] ${signal} received, closing workers`);
  clearInterval(heartbeatTimer);
  clearTimeout(pollStartupTimer);
  clearInterval(pollTimer);
  clearTimeout(tokenRefreshStartupTimer);
  clearInterval(tokenRefreshTimer);
  await Promise.all([dmWorker.close(), tiktokIngressWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
