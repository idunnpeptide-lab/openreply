import { TikTokWebhookError } from "@/lib/tiktok/webhook";

export type TikTokCommentUpdateAction =
  | "insert"
  | "delete"
  | "set_to_hidden"
  | "set_to_friends_only"
  | "set_to_public";

export type TikTokCommentUpdateType = "comment" | "reply";

export type TikTokCommentUpdateContent = {
  commentId: string;
  videoId: string;
  parentCommentId: string | null;
  commentType: TikTokCommentUpdateType;
  commentAction: TikTokCommentUpdateAction;
  uniqueIdentifier: string | null;
  timestamp: number | null;
};

const COMMENT_ACTIONS = new Set<TikTokCommentUpdateAction>([
  "insert",
  "delete",
  "set_to_hidden",
  "set_to_friends_only",
  "set_to_public",
]);

const COMMENT_TYPES = new Set<TikTokCommentUpdateType>(["comment", "reply"]);

/**
 * TikTok serializes comment_id/video_id/parent_comment_id as bare JSON numbers
 * even though those IDs exceed Number.MAX_SAFE_INTEGER. Before JSON.parse can
 * round them, quote only those object-member numeric values. The event schema
 * is a flat object, and requiring `{` or `,` before the key prevents matching
 * escaped key-like text inside a JSON string value.
 */
function quoteUnsafeCommentIds(contentRaw: string) {
  return contentRaw.replace(
    /([,{]\s*)"(comment_id|video_id|parent_comment_id)"\s*:\s*(\d+)/g,
    '$1"$2":"$3"'
  );
}

function asRequiredId(value: unknown, field: string) {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  throw new TikTokWebhookError(
    `TikTok comment webhook ${field} is invalid`,
    "TIKTOK_COMMENT_WEBHOOK_INVALID_PAYLOAD",
    400
  );
}

export function parseTikTokCommentUpdateContent(
  contentRaw: string
): TikTokCommentUpdateContent {
  let payload: unknown;
  try {
    payload = JSON.parse(quoteUnsafeCommentIds(contentRaw));
  } catch {
    throw new TikTokWebhookError(
      "TikTok comment webhook content is not valid JSON",
      "TIKTOK_COMMENT_WEBHOOK_INVALID_JSON",
      400
    );
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new TikTokWebhookError(
      "TikTok comment webhook content must be an object",
      "TIKTOK_COMMENT_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  const record = payload as Record<string, unknown>;
  const commentId = asRequiredId(record.comment_id, "comment_id");
  const videoId = asRequiredId(record.video_id, "video_id");
  const parentCommentId =
    record.parent_comment_id === undefined || record.parent_comment_id === null
      ? null
      : asRequiredId(record.parent_comment_id, "parent_comment_id");

  if (
    typeof record.comment_type !== "string" ||
    !COMMENT_TYPES.has(record.comment_type as TikTokCommentUpdateType)
  ) {
    throw new TikTokWebhookError(
      "TikTok comment webhook comment_type is invalid",
      "TIKTOK_COMMENT_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  if (
    typeof record.comment_action !== "string" ||
    !COMMENT_ACTIONS.has(record.comment_action as TikTokCommentUpdateAction)
  ) {
    throw new TikTokWebhookError(
      "TikTok comment webhook comment_action is invalid",
      "TIKTOK_COMMENT_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  return {
    commentId,
    videoId,
    parentCommentId,
    commentType: record.comment_type as TikTokCommentUpdateType,
    commentAction: record.comment_action as TikTokCommentUpdateAction,
    uniqueIdentifier:
      typeof record.unique_identifier === "string" &&
      record.unique_identifier.trim()
        ? record.unique_identifier.trim()
        : null,
    timestamp: Number.isFinite(record.timestamp)
      ? Number(record.timestamp)
      : null,
  };
}
