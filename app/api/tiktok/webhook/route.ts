import { createHash } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  readRequestTextWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/read-limited-body";
import {
  getTikTokIngressQueue,
  TIKTOK_COMMENT_INGRESS_JOB,
  TIKTOK_EU_MESSAGE_SYNC_JOB,
  TIKTOK_MESSAGE_INGRESS_JOB,
} from "@/lib/queue/tiktok-ingress";
import {
  buildTikTokWebhookDedupeKey,
  parseTikTokWebhookEnvelope,
  TikTokWebhookError,
  verifyTikTokWebhookSignature,
} from "@/lib/tiktok/webhook";

const MAX_WEBHOOK_BODY_BYTES = 512 * 1024;

/**
 * Some TikTok events repeat the business/open id inside the stringified
 * content object. Extract only string-valued account identifiers directly from
 * the raw content instead of JSON.parse-ing the object, because COMMENT
 * content can also contain 64-bit numeric ids that JavaScript would round.
 */
function candidateBusinessId(contentRaw: string): string | null {
  for (const key of ["business_id", "open_id", "user_openid"]) {
    const pattern = new RegExp(
      `(?:^|[,{]\\s*)"${key}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`
    );
    const match = pattern.exec(contentRaw);
    if (!match?.[1]) continue;
    try {
      const value = JSON.parse(match[1]);
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      // Ignore malformed candidate strings; the raw event is still stored and
      // event-specific validation decides whether it can be processed later.
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await readRequestTextWithLimit(request, MAX_WEBHOOK_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json(
        { success: false, error: "Payload too large" },
        { status: 413 }
      );
    }
    throw error;
  }

  const signatureHeader = request.headers.get("tiktok-signature");
  const verification = verifyTikTokWebhookSignature({
    rawBody,
    signatureHeader,
  });

  if (!verification.valid) {
    await prisma.operationalEvent
      .create({
        data: {
          source: "SYSTEM",
          level: "WARNING",
          message: "TikTok webhook signature verification failed",
          payload: {
            reason: verification.reason,
            hadSignatureHeader: Boolean(signatureHeader),
            bodyLength: Buffer.byteLength(rawBody, "utf8"),
            payloadSha256: createHash("sha256")
              .update(rawBody, "utf8")
              .digest("hex"),
          },
        },
      })
      .catch(() => {});

    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  let envelope;
  try {
    envelope = parseTikTokWebhookEnvelope(rawBody);
  } catch (error) {
    if (error instanceof TikTokWebhookError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }

  const openId =
    envelope.userOpenId ?? candidateBusinessId(envelope.contentRaw);
  const account = openId
    ? await prisma.tikTokAccount.findUnique({
        where: { openId },
        select: { id: true, openId: true, workspaceId: true },
      })
    : null;

  const dedupeKey = buildTikTokWebhookDedupeKey({
    rawBody,
    signatureTimestamp: verification.timestamp,
  });
  const webhookEventId = `tiktok_${dedupeKey}`;

  let payload: Prisma.InputJsonValue;
  try {
    // The outer envelope is safe to decode: event-specific content remains a
    // JSON string inside it, so large numeric COMMENT ids are not interpreted.
    payload = JSON.parse(rawBody) as Prisma.InputJsonValue;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  let duplicate = false;
  try {
    await prisma.webhookEvent.create({
      data: {
        id: webhookEventId,
        workspaceId: account?.workspaceId ?? null,
        object: `TIKTOK:${envelope.event}`,
        payload,
        status: "PENDING",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      duplicate = true;
    } else {
      throw error;
    }
  }

  // Provider-specific work stays on the isolated TikTok queue. If queueing
  // fails, return 500 so TikTok retries; duplicate receipt processing will try
  // the same deterministic queue id again rather than losing the event.
  if (account && envelope.event === "comment.update") {
    await getTikTokIngressQueue().add(
      TIKTOK_COMMENT_INGRESS_JOB,
      {
        webhookEventId,
        workspaceId: account.workspaceId,
        tiktokAccountId: account.id,
        businessId: account.openId,
        contentRaw: envelope.contentRaw,
      },
      { jobId: `comment_${dedupeKey}` }
    );
  }

  if (account && envelope.event === "im_receive_msg") {
    await getTikTokIngressQueue().add(
      TIKTOK_MESSAGE_INGRESS_JOB,
      {
        webhookEventId,
        workspaceId: account.workspaceId,
        tiktokAccountId: account.id,
        businessId: account.openId,
        contentRaw: envelope.contentRaw,
      },
      { jobId: `message_${dedupeKey}` }
    );
  }

  // EEA/Switzerland/UK webhook payloads intentionally omit sender,
  // conversation id and body. Reconcile them through the official conversation
  // endpoints and fail closed if the timestamp maps to zero or multiple text
  // messages rather than guessing the user or keyword.
  if (account && envelope.event === "im_receive_msg_eu") {
    await getTikTokIngressQueue().add(
      TIKTOK_EU_MESSAGE_SYNC_JOB,
      {
        webhookEventId,
        workspaceId: account.workspaceId,
        tiktokAccountId: account.id,
        businessId: account.openId,
        contentRaw: envelope.contentRaw,
      },
      { jobId: `message_eu_${dedupeKey}` }
    );
  }

  return NextResponse.json(
    { success: true, accepted: true, duplicate },
    { status: 200 }
  );
}
