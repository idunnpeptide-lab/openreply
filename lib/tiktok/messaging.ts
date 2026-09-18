import { prisma } from "@/lib/db/client";
import { getValidTikTokAccessToken } from "@/lib/tiktok/accounts";
import {
  TIKTOK_BUSINESS_API_BASE_URL,
  TIKTOK_BUSINESS_API_VERSION,
} from "@/lib/tiktok/config";

const MAX_CONVERSATION_PAGE_SIZE = 100;
const MAX_TEXT_MESSAGE_LENGTH = 6000;

type TikTokApiEnvelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

export type TikTokConversation = {
  conversation_id: string;
  update_time?: number;
  referral?: Record<string, unknown>;
};

export type TikTokMessageParticipant = {
  role?: "BUSINESS_ACCOUNT" | "PERSONAL_ACCOUNT" | string;
  id?: string;
  unique_identifier?: string;
  username?: string;
  display_name?: string;
  profile_image?: string;
  is_follower?: boolean;
};

export type TikTokBusinessMessage = {
  sender?: string;
  recipient?: string;
  conversation_id: string;
  message_id: string;
  timestamp?: number;
  message_type?: string;
  auto_message_type?: string;
  text?: { body?: string };
  from_user?: TikTokMessageParticipant;
  to_user?: TikTokMessageParticipant;
  message_tag?: { source?: string };
};

export class TikTokMessagingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TikTokMessagingError";
  }
}

function endpoint(path: string) {
  return `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}${path}`;
}

function bounded(value: number | undefined, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(value as number)));
}

async function requestTikTokMessaging<T>(input: {
  path: string;
  accessToken: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: Record<string, unknown>;
}) {
  const url = new URL(endpoint(input.path));
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: input.method ?? "GET",
    headers: {
      "Access-Token": input.accessToken,
      Accept: "application/json",
      ...(input.body ? { "Content-Type": "application/json" } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokApiEnvelope<T>
    | null;

  if (!response.ok || !payload || payload.code !== 0 || payload.data === undefined) {
    throw new TikTokMessagingError(
      payload?.message || `TikTok Business Messaging request failed with HTTP ${response.status}`,
      payload ? String(payload.code) : "TIKTOK_MESSAGING_HTTP_ERROR",
      response.status || 502
    );
  }

  return payload.data;
}

async function getMessagingAccount(tiktokAccountId: string) {
  const accessToken = await getValidTikTokAccessToken(tiktokAccountId);
  const account = await prisma.tikTokAccount.findUnique({
    where: { id: tiktokAccountId },
    select: {
      id: true,
      openId: true,
      grantedScopes: true,
      messagingEnabled: true,
      commentToMessageEnabled: true,
    },
  });

  if (!account) {
    throw new TikTokMessagingError(
      "TikTok account was not found",
      "TIKTOK_ACCOUNT_NOT_FOUND",
      404
    );
  }

  return { account, accessToken };
}

function requireScope(scopes: string[], scope: string) {
  if (!scopes.includes(scope)) {
    throw new TikTokMessagingError(
      `TikTok permission ${scope} is not granted for this account`,
      "TIKTOK_MESSAGING_SCOPE_REQUIRED",
      403
    );
  }
}

function validateText(raw: string) {
  const text = raw.trim();
  const length = [...text].length;
  if (!text || length > MAX_TEXT_MESSAGE_LENGTH) {
    throw new TikTokMessagingError(
      `TikTok text messages must contain 1-${MAX_TEXT_MESSAGE_LENGTH} characters`,
      "TIKTOK_MESSAGE_TEXT_INVALID",
      400
    );
  }
  return text;
}

export async function listTikTokConversations(input: {
  tiktokAccountId: string;
  conversationType: "STRANGER" | "SINGLE";
  cursor?: number;
  limit?: number;
}) {
  const { account, accessToken } = await getMessagingAccount(
    input.tiktokAccountId
  );
  requireScope(account.grantedScopes, "message.list.read");

  const data = await requestTikTokMessaging<{
    conversations?: TikTokConversation[];
    cursor?: number;
    has_more?: boolean;
  }>({
    path: "/business/message/conversation/list/",
    accessToken,
    query: {
      business_id: account.openId,
      conversation_type: input.conversationType,
      cursor: input.cursor ?? 0,
      limit: bounded(input.limit, MAX_CONVERSATION_PAGE_SIZE, 100),
    },
  });

  return {
    items: data.conversations ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.has_more),
  };
}

export async function listTikTokMessages(input: {
  tiktokAccountId: string;
  conversationId: string;
}) {
  const { account, accessToken } = await getMessagingAccount(
    input.tiktokAccountId
  );
  requireScope(account.grantedScopes, "message.list.read");

  const data = await requestTikTokMessaging<{
    messages?: TikTokBusinessMessage[];
    participants?: TikTokMessageParticipant[];
  }>({
    path: "/business/message/content/list/",
    accessToken,
    query: {
      business_id: account.openId,
      conversation_id: input.conversationId,
    },
  });

  return {
    messages: data.messages ?? [],
    participants: data.participants ?? [],
  };
}

export async function sendTikTokTextMessage(input: {
  tiktokAccountId: string;
  conversationId: string;
  text: string;
  referencedMessageId?: string;
}) {
  const text = validateText(input.text);
  const { account, accessToken } = await getMessagingAccount(
    input.tiktokAccountId
  );
  requireScope(account.grantedScopes, "message.list.send");

  const data = await requestTikTokMessaging<{
    message?: { message_id?: string };
  }>({
    path: "/business/message/send/",
    accessToken,
    method: "POST",
    body: {
      business_id: account.openId,
      recipient_type: "CONVERSATION",
      recipient: input.conversationId,
      message_type: "TEXT",
      text: { body: text },
      ...(input.referencedMessageId
        ? {
            referenced_message_info: {
              referenced_message_id: input.referencedMessageId,
            },
          }
        : {}),
    },
  });

  return { messageId: data.message?.message_id ?? "" };
}

export async function getTikTokCommentToMessageSetting(
  tiktokAccountId: string
) {
  const { account, accessToken } = await getMessagingAccount(tiktokAccountId);
  requireScope(account.grantedScopes, "message.list.read");

  const data = await requestTikTokMessaging<{
    business_id?: string;
    direct_reply_type?: string;
    operation_status?: "ENABLE" | "DISABLE" | string;
  }>({
    path: "/business/message/direct_reply/get/",
    accessToken,
    query: {
      business_id: account.openId,
      direct_reply_type: "COMMENT_TO_MESSAGE",
    },
  });

  const enabled = data.operation_status === "ENABLE";
  await prisma.tikTokAccount.update({
    where: { id: account.id },
    data: { commentToMessageEnabled: enabled },
  });

  return {
    enabled,
    operationStatus: data.operation_status ?? "DISABLE",
  };
}

/**
 * Send TikTok's official Comment-to-Message direct reply. This must only be
 * called after the account setting has been verified as enabled. TikTok also
 * applies account/region/user/time-window eligibility rules server-side, so API
 * rejections are surfaced and must not be bypassed with scraping or automation.
 */
export async function sendTikTokCommentDirectReply(input: {
  tiktokAccountId: string;
  commentId: string;
  text: string;
}) {
  const text = validateText(input.text);
  const { account, accessToken } = await getMessagingAccount(
    input.tiktokAccountId
  );
  requireScope(account.grantedScopes, "message.list.send");

  if (!account.commentToMessageEnabled) {
    throw new TikTokMessagingError(
      "TikTok Comment-to-Message is not enabled for this Business Account",
      "TIKTOK_COMMENT_TO_MESSAGE_DISABLED",
      409
    );
  }

  const data = await requestTikTokMessaging<{
    message?: { message_id?: string };
  }>({
    path: "/business/message/send/",
    accessToken,
    method: "POST",
    body: {
      business_id: account.openId,
      message_type: "TEXT",
      text: { body: text },
      direct_reply: {
        reply_type: "COMMENT_REPLY",
        comment_reply: { comment_id: input.commentId },
      },
    },
  });

  return { messageId: data.message?.message_id ?? "" };
}
