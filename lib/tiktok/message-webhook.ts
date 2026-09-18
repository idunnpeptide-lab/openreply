import type { SocialMessageEvent } from "@/lib/social-platform";
import { TikTokWebhookError } from "@/lib/tiktok/webhook";

export type TikTokInboundMessageWebhook = {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderUsername: string | null;
  text: string | null;
  messageType: string;
  isFollower: boolean | null;
  timestamp: number | null;
};

export type TikTokEuInboundMessageWebhook = {
  receiverUsername: string | null;
  receiverId: string | null;
  timestamp: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseContentObject(contentRaw: string, label: string) {
  let payload: unknown;
  try {
    payload = JSON.parse(contentRaw);
  } catch {
    throw new TikTokWebhookError(
      `TikTok ${label} content is not valid JSON`,
      "TIKTOK_MESSAGE_WEBHOOK_INVALID_JSON",
      400
    );
  }

  if (!isRecord(payload)) {
    throw new TikTokWebhookError(
      `TikTok ${label} content must be an object`,
      "TIKTOK_MESSAGE_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }
  return payload;
}

export function parseTikTokInboundMessageContent(
  contentRaw: string
): TikTokInboundMessageWebhook {
  const payload = parseContentObject(contentRaw, "inbound message");

  const conversationId = optionalString(payload.conversation_id);
  const messageId = optionalString(payload.message_id);
  const messageType = optionalString(payload.type);
  const uniqueIdentifier = optionalString(payload.unique_identifier);
  const fromUser = isRecord(payload.from_user) ? payload.from_user : null;
  const senderId = uniqueIdentifier ?? optionalString(fromUser?.id);
  const senderUsername = optionalString(payload.from);
  const textObject = isRecord(payload.text) ? payload.text : null;
  const text = optionalString(textObject?.body);

  if (!conversationId || !messageId || !messageType || !senderId) {
    throw new TikTokWebhookError(
      "TikTok inbound message webhook is missing identifiers",
      "TIKTOK_MESSAGE_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  return {
    conversationId,
    messageId,
    senderId,
    senderUsername,
    text,
    messageType,
    isFollower:
      typeof payload.is_follower === "boolean" ? payload.is_follower : null,
    timestamp: Number.isFinite(payload.timestamp)
      ? Number(payload.timestamp)
      : null,
  };
}

/**
 * TikTok intentionally strips sender, conversation id and message body from
 * `im_receive_msg_eu` for EEA/Switzerland/UK senders. The timestamp is the only
 * correlation key we can safely use when resolving the message via the normal
 * conversation APIs.
 */
export function parseTikTokEuInboundMessageContent(
  contentRaw: string
): TikTokEuInboundMessageWebhook {
  const payload = parseContentObject(contentRaw, "EU inbound message");
  const toUser = isRecord(payload.to_user) ? payload.to_user : null;
  const timestamp = Number(payload.timestamp);

  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw new TikTokWebhookError(
      "TikTok EU inbound message webhook is missing a valid timestamp",
      "TIKTOK_EU_MESSAGE_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  return {
    receiverUsername: optionalString(payload.to),
    receiverId: optionalString(toUser?.id),
    timestamp,
  };
}

export function normalizeTikTokInboundMessageEvent(input: {
  businessId: string;
  message: TikTokInboundMessageWebhook;
}): SocialMessageEvent | null {
  // Keyword automations can only reason about real text messages. Images,
  // stickers, reactions, templates, etc. are acknowledged but never coerced
  // into fake text.
  if (input.message.messageType !== "text" || !input.message.text) return null;

  let createdAt: string | null = null;
  if (Number.isFinite(input.message.timestamp)) {
    const date = new Date(Number(input.message.timestamp));
    if (!Number.isNaN(date.getTime())) createdAt = date.toISOString();
  }

  return {
    platform: "TIKTOK",
    accountId: input.businessId,
    conversationId: input.message.conversationId,
    messageId: input.message.messageId,
    senderId: input.message.senderId,
    senderUsername: input.message.senderUsername,
    text: input.message.text,
    isFollower: input.message.isFollower,
    createdAt,
  };
}
