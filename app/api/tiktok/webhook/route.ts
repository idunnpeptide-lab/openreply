import { createHash } from "node:crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  readRequestTextWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/read-limited-body";
import {
  buildTikTokWebhookDedupeKey,
  parseTikTokWebhookEnvelope,
  TikTokWebhookError,
  verifyTikTokWebhookSignature,
} from "@/lib/tiktok/webhook";

const MAX_WEBHOOK_BODY_BYTES = 512 * 1024;

function candidateBusinessId(content: unknown): string | null {
  if (typeof content !== "object" || !content || Array.isArray(content)) {
    return null;
  }

  const record = content as Record<string, unknown>;
  for (const key of ["business_id", "open_id", "user_openid"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
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

  const openId = envelope.userOpenId ?? candidateBusinessId(envelope.content);
  const account = openId
    ? await prisma.tikTokAccount.findUnique({
        where: { openId },
        select: { workspaceId: true },
      })
    : null;

  const dedupeKey = buildTikTokWebhookDedupeKey({
    rawBody,
    signatureTimestamp: verification.timestamp,
  });

  let payload: Prisma.InputJsonValue;
  try {
    payload = JSON.parse(rawBody) as Prisma.InputJsonValue;
  } catch {
    // parseTikTokWebhookEnvelope already validates JSON. This is only a type-
    // safe fallback in case the implementation changes later.
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  try {
    await prisma.webhookEvent.create({
      data: {
        // A deterministic primary key gives webhook receipt idempotency without
        // changing the existing Meta webhook schema. TikTok may retry the same
        // signed delivery; duplicate retries should still receive 200 OK.
        id: `tiktok_${dedupeKey}`,
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
      return NextResponse.json(
        { success: true, duplicate: true },
        { status: 200 }
      );
    }
    throw error;
  }

  // Intentionally stop at verified durable ingestion. Event-specific COMMENT
  // and DIRECT_MESSAGE payload routing is enabled only after their exact TikTok
  // schemas are validated against a real approved developer app. This prevents
  // a malformed or misunderstood event from triggering customer automations.
  return NextResponse.json(
    { success: true, accepted: true },
    { status: 200 }
  );
}
