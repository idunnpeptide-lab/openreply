import { prisma } from "@/lib/db/client";
import { getValidTikTokAccessToken } from "@/lib/tiktok/accounts";
import { TikTokApiError, type TikTokComment } from "@/lib/tiktok/client";
import {
  TIKTOK_BUSINESS_API_BASE_URL,
  TIKTOK_BUSINESS_API_VERSION,
} from "@/lib/tiktok/config";

type TikTokApiEnvelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

/**
 * Resolve one webhook comment by its exact id. TikTok's `comment.update`
 * payload deliberately omits the text, so an insert event must be followed by
 * `/business/comment/list/` with `comment_ids` before keyword matching is safe.
 */
export async function getTikTokCommentById(input: {
  tiktokAccountId: string;
  videoId: string;
  commentId: string;
}): Promise<TikTokComment | null> {
  const accessToken = await getValidTikTokAccessToken(input.tiktokAccountId);
  const account = await prisma.tikTokAccount.findUnique({
    where: { id: input.tiktokAccountId },
    select: {
      openId: true,
      commentsEnabled: true,
    },
  });

  if (!account) {
    throw new TikTokApiError(
      "TikTok account was not found",
      "TIKTOK_ACCOUNT_NOT_FOUND",
      404
    );
  }
  if (!account.commentsEnabled) {
    throw new TikTokApiError(
      "TikTok comment access is not granted for this account",
      "TIKTOK_COMMENT_SCOPE_REQUIRED",
      403
    );
  }

  const url = new URL(
    `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}/business/comment/list/`
  );
  url.searchParams.set("business_id", account.openId);
  url.searchParams.set("video_id", input.videoId);
  url.searchParams.set("comment_ids", JSON.stringify([input.commentId]));
  url.searchParams.set("status", "ALL");
  url.searchParams.set("max_count", "1");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Access-Token": accessToken,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokApiEnvelope<{ comments?: TikTokComment[] }>
    | null;

  if (!response.ok || !payload || payload.code !== 0 || !payload.data) {
    throw new TikTokApiError(
      payload?.message ||
        `TikTok comment lookup failed with HTTP ${response.status}`,
      payload ? String(payload.code) : "TIKTOK_HTTP_ERROR",
      response.status || 502
    );
  }

  return (
    payload.data.comments?.find(
      (comment) => comment.comment_id === input.commentId
    ) ?? null
  );
}
