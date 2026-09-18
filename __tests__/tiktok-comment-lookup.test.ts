import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));
const tokenMocks = vi.hoisted(() => ({
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
  getValidTikTokAccessToken: tokenMocks.getAccessToken,
}));

import { getTikTokCommentById } from "../lib/tiktok/comment-lookup";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  tokenMocks.getAccessToken.mockResolvedValue("access_123");
  dbMocks.findUnique.mockResolvedValue({
    openId: "open_123",
    commentsEnabled: true,
  });
});

describe("TikTok exact comment lookup", () => {
  it("queries comment_ids so a webhook comment is resolved exactly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            comments: [
              {
                comment_id: "7247303576418566913",
                video_id: "7203946942097902849",
                unique_identifier: "global_user_1",
                text: "GUIDE",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTikTokCommentById({
      tiktokAccountId: "tt_db_1",
      videoId: "7203946942097902849",
      commentId: "7247303576418566913",
    });

    expect(result?.text).toBe("GUIDE");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/comment/list/");
    expect(url.searchParams.get("business_id")).toBe("open_123");
    expect(url.searchParams.get("video_id")).toBe("7203946942097902849");
    expect(url.searchParams.get("comment_ids")).toBe(
      '["7247303576418566913"]'
    );
    expect(url.searchParams.get("status")).toBe("ALL");
    expect(url.searchParams.get("max_count")).toBe("1");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Access-Token"]).toBe(
      "access_123"
    );
  });

  it("returns null instead of guessing when the exact id is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 0,
            message: "OK",
            data: {
              comments: [{ comment_id: "different", text: "other" }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    await expect(
      getTikTokCommentById({
        tiktokAccountId: "tt_db_1",
        videoId: "video_1",
        commentId: "comment_expected",
      })
    ).resolves.toBeNull();
  });

  it("fails closed before network access when comment scope is missing", async () => {
    dbMocks.findUnique.mockResolvedValue({
      openId: "open_123",
      commentsEnabled: false,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTikTokCommentById({
        tiktokAccountId: "tt_db_1",
        videoId: "video_1",
        commentId: "comment_1",
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_COMMENT_SCOPE_REQUIRED",
      status: 403,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
