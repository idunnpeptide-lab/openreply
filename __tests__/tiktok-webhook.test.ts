import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseTikTokCommentUpdateContent } from "../lib/tiktok/comment-webhook";
import {
  buildTikTokWebhookDedupeKey,
  deleteTikTokWebhook,
  listTikTokWebhookConfig,
  parseTikTokWebhookEnvelope,
  updateTikTokWebhook,
  verifyTikTokWebhookSignature,
} from "../lib/tiktok/webhook";

const SECRET = "tiktok-test-secret";
const NOW = 1_800_000_000;
const RAW_CONTENT = JSON.stringify({
  business_id: "open_123",
  comment_id: "comment_1",
});
const RAW_BODY = JSON.stringify({
  client_key: "app_123",
  event: "comment.update",
  create_time: NOW,
  user_openid: "open_123",
  content: RAW_CONTENT,
});

function signature(rawBody = RAW_BODY, timestamp = NOW) {
  const digest = createHmac("sha256", SECRET)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},s=${digest}`;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  vi.stubEnv("TIKTOK_BUSINESS_APP_ID", "app_123");
  vi.stubEnv("TIKTOK_BUSINESS_APP_SECRET", SECRET);
});

describe("TikTok webhook verification", () => {
  it("verifies HMAC-SHA256 against timestamp dot raw body", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: signature(),
        clientSecret: SECRET,
        nowSeconds: NOW,
      })
    ).toEqual({ valid: true, timestamp: NOW });
  });

  it("rejects a modified raw payload", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody: `${RAW_BODY} `,
        signatureHeader: signature(),
        clientSecret: SECRET,
        nowSeconds: NOW,
      })
    ).toMatchObject({ valid: false, reason: "mismatch" });
  });

  it("rejects old signed payloads to reduce replay risk", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: signature(RAW_BODY, NOW - 301),
        clientSecret: SECRET,
        nowSeconds: NOW,
        toleranceSeconds: 300,
      })
    ).toMatchObject({ valid: false, reason: "stale" });
  });

  it("rejects missing and malformed signature headers", () => {
    expect(
      verifyTikTokWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: null,
        clientSecret: SECRET,
        nowSeconds: NOW,
      })
    ).toEqual({ valid: false, reason: "missing" });

    expect(
      verifyTikTokWebhookSignature({
        rawBody: RAW_BODY,
        signatureHeader: "t=not-a-number,s=nope",
        clientSecret: SECRET,
        nowSeconds: NOW,
      })
    ).toEqual({ valid: false, reason: "malformed" });
  });

  it("parses the generic envelope while preserving event content verbatim", () => {
    expect(parseTikTokWebhookEnvelope(RAW_BODY)).toEqual({
      clientKey: "app_123",
      event: "comment.update",
      createTime: NOW,
      userOpenId: "open_123",
      contentRaw: RAW_CONTENT,
    });
  });

  it("keeps unknown content as the untouched raw string", () => {
    const raw = JSON.stringify({
      client_key: "app_123",
      event: "future.event",
      create_time: NOW,
      content: "opaque-content",
    });

    expect(parseTikTokWebhookEnvelope(raw).contentRaw).toBe("opaque-content");
  });

  it("builds stable delivery dedupe keys without storing the signature itself", () => {
    const first = buildTikTokWebhookDedupeKey({
      rawBody: RAW_BODY,
      signatureTimestamp: NOW,
    });
    const second = buildTikTokWebhookDedupeKey({
      rawBody: RAW_BODY,
      signatureTimestamp: NOW,
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("TikTok comment webhook parsing", () => {
  it("preserves 64-bit TikTok ids exactly instead of rounding them", () => {
    const contentRaw =
      '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"parent_comment_id":7247303576418566999,"comment_type":"reply","comment_action":"insert","unique_identifier":"user_global_1","timestamp":1800000000123}';

    expect(parseTikTokCommentUpdateContent(contentRaw)).toEqual({
      commentId: "7247303576418566913",
      videoId: "7203946942097902849",
      parentCommentId: "7247303576418566999",
      commentType: "reply",
      commentAction: "insert",
      uniqueIdentifier: "user_global_1",
      timestamp: 1800000000123,
    });
  });

  it("accepts top-level comments without a parent id", () => {
    expect(
      parseTikTokCommentUpdateContent(
        '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"insert","timestamp":1800000000123}'
      )
    ).toMatchObject({
      commentId: "7247303576418566913",
      videoId: "7203946942097902849",
      parentCommentId: null,
      commentType: "comment",
      commentAction: "insert",
    });
  });

  it("does not rewrite key-like text inside JSON string values", () => {
    const parsed = parseTikTokCommentUpdateContent(
      '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"insert","unique_identifier":"text-\\\"comment_id\\\":999"}'
    );

    expect(parsed.commentId).toBe("7247303576418566913");
    expect(parsed.uniqueIdentifier).toBe('text-"comment_id":999');
  });

  it("fails closed on unknown comment actions", () => {
    expect(() =>
      parseTikTokCommentUpdateContent(
        '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"future_action"}'
      )
    ).toThrowError(/comment_action is invalid/);
  });
});

describe("TikTok webhook configuration client", () => {
  it("creates a webhook subscription with app credentials in the official body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            app_id: "app_123",
            event_type: "COMMENT",
            callback_url: "https://app.replyhalo.example/api/tiktok/webhook",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await updateTikTokWebhook({
      eventType: "COMMENT",
      callbackUrl: "https://app.replyhalo.example/api/tiktok/webhook",
      itemList: ["video_1", "video_2"],
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/webhook/update/");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      app_id: "app_123",
      secret: SECRET,
      event_type: "COMMENT",
      callback_url: "https://app.replyhalo.example/api/tiktok/webhook",
      item_list: ["video_1", "video_2"],
    });
  });

  it("refuses non-HTTPS callback URLs before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateTikTokWebhook({
        eventType: "DIRECT_MESSAGE",
        callbackUrl: "http://example.com/webhook",
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_WEBHOOK_CALLBACK_INVALID",
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists a webhook subscription using app_id, secret and event_type query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            app_id: "app_123",
            event_type: "DIRECT_MESSAGE",
            callback_url: "https://app.replyhalo.example/api/tiktok/webhook",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await listTikTokWebhookConfig("DIRECT_MESSAGE");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/webhook/list/");
    expect(url.searchParams.get("app_id")).toBe("app_123");
    expect(url.searchParams.get("secret")).toBe(SECRET);
    expect(url.searchParams.get("event_type")).toBe("DIRECT_MESSAGE");
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).method).toBe("GET");
  });

  it("deletes a webhook subscription with a POST body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, message: "OK", data: {} }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await deleteTikTokWebhook("VIDEO");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/webhook/delete/");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      app_id: "app_123",
      secret: SECRET,
      event_type: "VIDEO",
    });
  });
});
