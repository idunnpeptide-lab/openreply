import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));
const accountMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findUnique: dbMocks.findUnique,
    },
  },
}));

vi.mock("@/lib/tiktok/accounts", () => ({
  getValidTikTokAccessToken: accountMocks.getAccessToken,
}));

import {
  listTikTokComments,
  listTikTokCommentReplies,
  listTikTokVideos,
  normalizeTikTokCommentEvent,
  replyToTikTokComment,
} from "../lib/tiktok/client";

function accountFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "tt_db_1",
    openId: "open_123",
    commentsEnabled: true,
    publicReplyEnabled: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  accountMocks.getAccessToken.mockResolvedValue("access_123");
  dbMocks.findUnique.mockResolvedValue(accountFixture());
});

describe("TikTok Organic API client", () => {
  it("lists videos with the official business account endpoint and caps page size", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            videos: [{ item_id: "video_1", caption: "Demo" }],
            cursor: 1700000000000,
            has_more: true,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listTikTokVideos({
      tiktokAccountId: "tt_db_1",
      maxCount: 999,
      cursor: 1699999999000,
    });

    expect(result).toEqual({
      items: [{ item_id: "video_1", caption: "Demo" }],
      cursor: 1700000000000,
      hasMore: true,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/video/list/");
    expect(url.searchParams.get("business_id")).toBe("open_123");
    expect(url.searchParams.get("max_count")).toBe("20");
    expect(url.searchParams.get("cursor")).toBe("1699999999000");
    expect(url.searchParams.get("fields")).toContain("item_id");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Access-Token"]).toBe(
      "access_123"
    );
  });

  it("lists comments using business_id from OAuth open_id and safe pagination", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            comments: [
              {
                comment_id: "comment_1",
                video_id: "video_1",
                unique_identifier: "user_global_1",
                text: "GUIDE",
              },
            ],
            cursor: 18,
            has_more: false,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listTikTokComments({
      tiktokAccountId: "tt_db_1",
      videoId: "video_1",
      maxCount: 50,
      includeReplies: true,
      sortField: "create_time",
      sortType: "desc",
    });

    expect(result.items[0]?.comment_id).toBe("comment_1");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/comment/list/");
    expect(url.searchParams.get("business_id")).toBe("open_123");
    expect(url.searchParams.get("video_id")).toBe("video_1");
    expect(url.searchParams.get("include_replies")).toBe("true");
    expect(url.searchParams.get("status")).toBe("PUBLIC");
    expect(url.searchParams.get("max_count")).toBe("30");
    expect(url.searchParams.get("sort_field")).toBe("create_time");
    expect(url.searchParams.get("sort_type")).toBe("desc");
  });

  it("fails closed when the account lacks comment read capability", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({ commentsEnabled: false })
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listTikTokComments({
        tiktokAccountId: "tt_db_1",
        videoId: "video_1",
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_COMMENT_SCOPE_REQUIRED",
      status: 403,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists all replies through the dedicated reply endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            comments: [
              {
                comment_id: "reply_1",
                parent_comment_id: "comment_1",
                text: "Thanks",
              },
            ],
            cursor: 2,
            has_more: false,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await listTikTokCommentReplies({
      tiktokAccountId: "tt_db_1",
      videoId: "video_1",
      commentId: "comment_1",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/comment/reply/list/");
    expect(url.searchParams.get("comment_id")).toBe("comment_1");
  });

  it("replies to a comment with the exact official JSON shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            comment_id: "reply_new",
            video_id: "video_1",
            parent_comment_id: "comment_1",
            text: "Sent you a DM",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await replyToTikTokComment({
      tiktokAccountId: "tt_db_1",
      videoId: "video_1",
      commentId: "comment_1",
      text: " Sent you a DM ",
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe(
      "/open_api/v1.3/business/comment/reply/create/"
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      business_id: "open_123",
      video_id: "video_1",
      comment_id: "comment_1",
      text: "Sent you a DM",
    });
  });

  it("rejects replies longer than TikTok's 150-character text limit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      replyToTikTokComment({
        tiktokAccountId: "tt_db_1",
        videoId: "video_1",
        commentId: "comment_1",
        text: "a".repeat(151),
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_REPLY_TEXT_INVALID",
      status: 400,
    });
    expect(accountMocks.getAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes TikTok comments into the shared provider event contract", () => {
    expect(
      normalizeTikTokCommentEvent({
        businessId: "open_123",
        fallbackVideoId: "video_fallback",
        comment: {
          comment_id: "comment_1",
          video_id: "video_1",
          user_id: "deprecated_user",
          unique_identifier: "global_user",
          username: "maya",
          text: " GUIDE ",
          create_time: 1_700_000_000,
        },
      })
    ).toEqual({
      platform: "TIKTOK",
      accountId: "open_123",
      contentId: "video_1",
      commentId: "comment_1",
      authorId: "global_user",
      authorUsername: "maya",
      text: "GUIDE",
      createdAt: "2023-11-14T22:13:20.000Z",
    });
  });
});
