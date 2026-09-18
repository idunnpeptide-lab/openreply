import type { SocialMessageEvent } from "@/lib/social-platform";
import {
  listTikTokConversations,
  listTikTokMessages,
  type TikTokBusinessMessage,
  type TikTokConversation,
} from "@/lib/tiktok/messaging";

const CONVERSATION_WINDOW_MS = 5 * 60 * 1000;
const MESSAGE_WINDOW_MS = 5 * 1000;
const MAX_CANDIDATE_CONVERSATIONS = 6;

export class TikTokEuMessageSyncError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TIKTOK_EU_MESSAGE_NOT_FOUND"
      | "TIKTOK_EU_MESSAGE_AMBIGUOUS"
      | "TIKTOK_EU_MESSAGE_TOO_MANY_CONVERSATIONS"
  ) {
    super(message);
    this.name = "TikTokEuMessageSyncError";
  }
}

function conversationUpdateTime(conversation: TikTokConversation) {
  const value = (conversation as TikTokConversation & { update_time?: number })
    .update_time;
  return Number.isFinite(value) ? Number(value) : null;
}

function isPersonalSender(message: TikTokBusinessMessage) {
  const role = message.from_user?.role?.toLowerCase();
  return role === "personal_account";
}

function senderId(message: TikTokBusinessMessage) {
  return (
    message.from_user?.unique_identifier?.trim() ||
    message.from_user?.id?.trim() ||
    null
  );
}

function toSocialMessageEvent(input: {
  businessId: string;
  message: TikTokBusinessMessage;
}): SocialMessageEvent | null {
  const { message } = input;
  const text = message.text?.body?.trim();
  const authorId = senderId(message);
  if (
    message.message_type !== "TEXT" ||
    !text ||
    !authorId ||
    !message.conversation_id ||
    !message.message_id
  ) {
    return null;
  }

  const timestamp = Number(message.timestamp);
  const createdAt = Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null;

  return {
    platform: "TIKTOK",
    accountId: input.businessId,
    conversationId: message.conversation_id,
    messageId: message.message_id,
    senderId: authorId,
    senderUsername:
      message.from_user?.username?.trim() || message.sender?.trim() || null,
    text,
    isFollower:
      typeof message.from_user?.is_follower === "boolean"
        ? message.from_user.is_follower
        : null,
    createdAt,
  };
}

/**
 * Resolve TikTok's stripped `im_receive_msg_eu` webhook without guessing.
 *
 * TikTok gives only the receiver and the original message timestamp. We inspect
 * recent STRANGER + SINGLE conversations whose last-update time is close to the
 * webhook timestamp, then accept a result only if exactly one inbound text
 * message has a matching timestamp. Zero or multiple candidates fail closed.
 *
 * The candidate cap keeps the resolver below TikTok Business Messaging's 10-QPS
 * ceiling in one pass: 2 conversation-list calls + at most 6 content calls.
 */
export async function resolveTikTokEuInboundMessage(input: {
  tiktokAccountId: string;
  businessId: string;
  timestamp: number;
}): Promise<SocialMessageEvent> {
  const [stranger, single] = await Promise.all([
    listTikTokConversations({
      tiktokAccountId: input.tiktokAccountId,
      conversationType: "STRANGER",
      limit: 100,
    }),
    listTikTokConversations({
      tiktokAccountId: input.tiktokAccountId,
      conversationType: "SINGLE",
      limit: 100,
    }),
  ]);

  const byId = new Map<string, TikTokConversation>();
  for (const conversation of [...stranger.items, ...single.items]) {
    const updatedAt = conversationUpdateTime(conversation);
    if (
      !conversation.conversation_id ||
      updatedAt === null ||
      Math.abs(updatedAt - input.timestamp) > CONVERSATION_WINDOW_MS
    ) {
      continue;
    }
    byId.set(conversation.conversation_id, conversation);
  }

  const candidates = [...byId.values()];
  if (candidates.length > MAX_CANDIDATE_CONVERSATIONS) {
    throw new TikTokEuMessageSyncError(
      `TikTok EU message resolver found ${candidates.length} recently updated conversations; refusing to guess`,
      "TIKTOK_EU_MESSAGE_TOO_MANY_CONVERSATIONS"
    );
  }

  const matches: SocialMessageEvent[] = [];
  for (const conversation of candidates) {
    const { messages } = await listTikTokMessages({
      tiktokAccountId: input.tiktokAccountId,
      conversationId: conversation.conversation_id,
    });

    for (const message of messages) {
      const timestamp = Number(message.timestamp);
      if (
        !Number.isFinite(timestamp) ||
        Math.abs(timestamp - input.timestamp) > MESSAGE_WINDOW_MS ||
        !isPersonalSender(message)
      ) {
        continue;
      }
      const normalized = toSocialMessageEvent({
        businessId: input.businessId,
        message,
      });
      if (normalized) matches.push(normalized);
    }
  }

  const uniqueByMessageId = new Map(
    matches.map((message) => [message.messageId, message] as const)
  );
  const uniqueMatches = [...uniqueByMessageId.values()];

  if (uniqueMatches.length === 0) {
    throw new TikTokEuMessageSyncError(
      "TikTok EU message resolver could not find an exact inbound text message near the webhook timestamp",
      "TIKTOK_EU_MESSAGE_NOT_FOUND"
    );
  }
  if (uniqueMatches.length > 1) {
    throw new TikTokEuMessageSyncError(
      `TikTok EU message resolver found ${uniqueMatches.length} plausible inbound messages; refusing to guess`,
      "TIKTOK_EU_MESSAGE_AMBIGUOUS"
    );
  }

  return uniqueMatches[0];
}
