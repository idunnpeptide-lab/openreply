import { prisma } from "@/lib/db/client";
import type { SocialCommentEvent } from "@/lib/social-platform";
import { getValidTikTokAccessToken } from "@/lib/tiktok/accounts";
import {
  TIKTOK_BUSINESS_API_BASE_URL,
  TIKTOK_BUSINESS_API_VERSION,
} from "@/lib/tiktok/config";

const VIDEO_FIELDS = [
  "item_id",
  "thumbnail_url",
  "caption",
  "likes",
  "comments",
  "shares",
  "video_views",
  "create_time",
] as const;

const MAX_VIDEO_PAGE_SIZE = 20;
const MAX_COMMENT_PAGE_SIZE = 30;
const MAX_REPLY_TEXT_LENGTH = 150;

type TikTokApiEnvelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

export type TikTokVideo = {
  item_id: string;
  thumbnail_url?: string;
  caption?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  video_views?: number;
  create_time?: number;
};

export type TikTokComment = {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  unique_identifier?: string;
  create_time?: number;
  text?: string;
  likes?: number;
  replies?: number;
  liked?: boolean;
  pinned?: boolean;
  status?: "PUBLIC" | "HIDDEN" | string;
  username?: string;
  display_name?: string;
  profile_image?: string;
  parent_comment_id?: string;
  reply_list?: TikTokComment[];
};

export type TikTokPage<T> = {
  items: T[];
  cursor: number;
  hasMore: boolean;
};

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

function apiUrl(path: string) {
  return `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}${path}`;
}

function boundedPageSize(value: number | undefined, maximum: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(maximum, Math.floor(value as number)));
}

async function requestTikTok<T>(input: {
  path: string;
  accessToken: string;
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
}): Promise<T> {
  const url = new URL(apiUrl(input.path));
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
    throw new TikTokApiError(
      payload?.message || `TikTok API request failed with HTTP ${response.status}`,
      payload ? String(payload.code) : "TIKTOK_HTTP_ERROR",
      response.status || 502
    );
  }

  return payload.data;
}

async function getAuthorizedAccount(tiktokAccountId: string) {
  // Refresh first because token rotation can also update granted scopes and the
  // derived capability flags stored on the account record.
  const accessToken = await getValidTikTokAccessToken(tiktokAccountId);
  const account = await prisma.tikTokAccount.findUnique({
    where: { id: tiktokAccountId },
    select: {
      id: true,
      openId: true,
      commentsEnabled: true,
      publicReplyEnabled: true,
    },
  });

  if (!account) {
    throw new TikTokApiError(
      "TikTok account was not found",
      "TIKTOK_ACCOUNT_NOT_FOUND",
      404
    );
  }

  return { account, accessToken };
}

export async function listTikTokVideos(input: {
  tiktokAccountId: string;
  cursor?: number;
  maxCount?: number;
  videoIds?: string[];
}) {
  const { account, accessToken } = await getAuthorizedAccount(
    input.tiktokAccountId
  );
  const maxCount = boundedPageSize(input.maxCount, MAX_VIDEO_PAGE_SIZE, 10);
  const filters = input.videoIds?.length
    ? JSON.stringify({ video_ids: input.videoIds.slice(0, 20) })
    : undefined;

  const data = await requestTikTok<{
    videos?: TikTokVideo[];
    cursor?: number;
    has_more?: boolean;
  }>({
    path: "/business/video/list/",
    accessToken,
    query: {
      business_id: account.openId,
      fields: JSON.stringify(VIDEO_FIELDS),
      filters,
      cursor: input.cursor,
      max_count: maxCount,
    },
  });

  return {
    items: data.videos ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.has_more),
  } satisfies TikTokPage<TikTokVideo>;
}

export async function listTikTokComments(input: {
  tiktokAccountId: string;
  videoId: string;
  cursor?: number;
  maxCount?: number;
  includeReplies?: boolean;
  status?: "PUBLIC" | "ALL";
  sortField?: "likes" | "replies" | "create_time";
  sortType?: "asc" | "desc" | "smart";
}) {
  const { account, accessToken } = await getAuthorizedAccount(
    input.tiktokAccountId
  );
  if (!account.commentsEnabled) {
    throw new TikTokApiError(
      "TikTok comment access is not granted for this account",
      "TIKTOK_COMMENT_SCOPE_REQUIRED",
      403
    );
  }

  const data = await requestTikTok<{
    comments?: TikTokComment[];
    cursor?: number;
    has_more?: boolean;
  }>({
    path: "/business/comment/list/",
    accessToken,
    query: {
      business_id: account.openId,
      video_id: input.videoId,
      include_replies: input.includeReplies,
      status: input.status ?? "PUBLIC",
      sort_field: input.sortField,
      sort_type: input.sortType,
      cursor: input.cursor ?? 0,
      max_count: boundedPageSize(input.maxCount, MAX_COMMENT_PAGE_SIZE, 20),
    },
  });

  return {
    items: data.comments ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.has_more),
  } satisfies TikTokPage<TikTokComment>;
}

export async function listTikTokCommentReplies(input: {
  tiktokAccountId: string;
  videoId: string;
  commentId: string;
  cursor?: number;
  maxCount?: number;
  status?: "PUBLIC" | "ALL";
  sortField?: "likes" | "replies" | "create_time";
  sortType?: "asc" | "desc" | "smart";
}) {
  const { account, accessToken } = await getAuthorizedAccount(
    input.tiktokAccountId
  );
  if (!account.commentsEnabled) {
    throw new TikTokApiError(
      "TikTok comment access is not granted for this account",
      "TIKTOK_COMMENT_SCOPE_REQUIRED",
      403
    );
  }

  const data = await requestTikTok<{
    comments?: TikTokComment[];
    cursor?: number;
    has_more?: boolean;
  }>({
    path: "/business/comment/reply/list/",
    accessToken,
    query: {
      business_id: account.openId,
      video_id: input.videoId,
      comment_id: input.commentId,
      status: input.status ?? "PUBLIC",
      sort_field: input.sortField,
      sort_type: input.sortType,
      cursor: input.cursor ?? 0,
      max_count: boundedPageSize(input.maxCount, MAX_COMMENT_PAGE_SIZE, 20),
    },
  });

  return {
    items: data.comments ?? [],
    cursor: data.cursor ?? 0,
    hasMore: Boolean(data.has_more),
  } satisfies TikTokPage<TikTokComment>;
}

export async function replyToTikTokComment(input: {
  tiktokAccountId: string;
  videoId: string;
  commentId: string;
  text: string;
}) {
  const text = input.text.trim();
  const characterCount = [...text].length;
  if (!text || characterCount > MAX_REPLY_TEXT_LENGTH) {
    throw new TikTokApiError(
      `TikTok comment replies must contain 1-${MAX_REPLY_TEXT_LENGTH} characters`,
      "TIKTOK_REPLY_TEXT_INVALID",
      400
    );
  }

  const { account, accessToken } = await getAuthorizedAccount(
    input.tiktokAccountId
  );
  if (!account.publicReplyEnabled) {
    throw new TikTokApiError(
      "TikTok comment reply access is not granted for this account",
      "TIKTOK_COMMENT_MANAGE_SCOPE_REQUIRED",
      403
    );
  }

  return requestTikTok<TikTokComment>({
    path: "/business/comment/reply/create/",
    accessToken,
    method: "POST",
    body: {
      business_id: account.openId,
      video_id: input.videoId,
      comment_id: input.commentId,
      text,
    },
  });
}

export function normalizeTikTokCommentEvent(input: {
  businessId: string;
  fallbackVideoId: string;
  comment: TikTokComment;
}): SocialCommentEvent | null {
  const commentId = input.comment.comment_id?.trim();
  const text = input.comment.text?.trim();
  const authorId =
    input.comment.unique_identifier?.trim() || input.comment.user_id?.trim();
  if (!commentId || !text || !authorId) return null;

  let createdAt: string | null = null;
  if (Number.isFinite(input.comment.create_time)) {
    // TikTok comment create_time is Epoch/Unix time. Current Organic API models
    // expose it as a number; tolerate either seconds or milliseconds.
    const raw = Number(input.comment.create_time);
    const millis = raw > 10_000_000_000 ? raw : raw * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) createdAt = date.toISOString();
  }

  return {
    platform: "TIKTOK",
    accountId: input.businessId,
    contentId: input.comment.video_id || input.fallbackVideoId,
    commentId,
    authorId,
    authorUsername:
      input.comment.username?.trim() || input.comment.display_name?.trim() || null,
    text,
    createdAt,
  };
}
