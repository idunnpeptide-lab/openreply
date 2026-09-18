import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));
const accountMocks = vi.hoisted(() => ({
  getAccessToken: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findUnique: dbMocks.findUnique,
      update: dbMocks.update,
    },
  },
}));

vi.mock("@/lib/tiktok/accounts", () => ({
  getValidTikTokAccessToken: accountMocks.getAccessToken,
}));

import {
  getTikTokCommentToMessageSetting,
  listTikTokConversations,
  listTikTokMessages,
  sendTikTokCommentDirectReply,
  sendTikTokTextMessage,
} from "../lib/tiktok/messaging";

function accountFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "tt_db_1",
    openId: "open_123",
    grantedScopes: ["message.list.read", "message.list.send"],
    messagingEnabled: true,
    commentToMessageEnabled: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  accountMocks.getAccessToken.mockResolvedValue("access_123");
  dbMocks.findUnique.mockResolvedValue(accountFixture());
  dbMocks.update.mockResolvedValue({});
});

describe("TikTok Business Messaging client", () => {
  it("lists conversations with read scope and caps limit at 100", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            conversations: [{ conversation_id: "conv+1", up_time: 123 }],
            cursor: 10,
            has_more: true,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listTikTokConversations({
      tiktokAccountId: "tt_db_1",
      conversationType: "SINGLE",
      limit: 500,
      cursor: 3,
    });

    expect(result).toEqual({
      items: [{ conversation_id: "conv+1", up_time: 123 }],
      cursor: 10,
      hasMore: true,
    });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe(
      "/open_api/v1.3/business/message/conversation/list/"
    );
    expect(url.searchParams.get("business_id")).toBe("open_123");
    expect(url.searchParams.get("conversation_type")).toBe("SINGLE");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("cursor")).toBe("3");
  });

  it("reads messages and safely URL-encodes conversation IDs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            messages: [
              {
                conversation_id: "abc+def",
                message_id: "message_1",
                message_type: "TEXT",
                text: { body: "GUIDE" },
              },
            ],
            participants: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await listTikTokMessages({
      tiktokAccountId: "tt_db_1",
      conversationId: "abc+def",
    });

    expect(result.messages[0]?.message_id).toBe("message_1");
    const rawUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(rawUrl).toContain("conversation_id=abc%2Bdef");
  });

  it("sends a text message only into an existing conversation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: { message: { message_id: "sent_1" } },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTikTokTextMessage({
        tiktokAccountId: "tt_db_1",
        conversationId: "conversation_1",
        text: " Here is your guide ",
      })
    ).resolves.toEqual({ messageId: "sent_1" });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/open_api/v1.3/business/message/send/");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      business_id: "open_123",
      recipient_type: "CONVERSATION",
      recipient: "conversation_1",
      message_type: "TEXT",
      text: { body: "Here is your guide" },
    });
  });

  it("fails closed for sends when message send scope is absent", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({ grantedScopes: ["message.list.read"] })
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTikTokTextMessage({
        tiktokAccountId: "tt_db_1",
        conversationId: "conversation_1",
        text: "hello",
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_MESSAGING_SCOPE_REQUIRED",
      status: 403,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than TikTok's 6000-character limit before API access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTikTokTextMessage({
        tiktokAccountId: "tt_db_1",
        conversationId: "conversation_1",
        text: "a".repeat(6001),
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_MESSAGE_TEXT_INVALID",
      status: 400,
    });
    expect(accountMocks.getAccessToken).not.toHaveBeenCalled();
  });

  it("reads and persists the official Comment-to-Message setting", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            business_id: "open_123",
            direct_reply_type: "COMMENT_TO_MESSAGE",
            operation_status: "ENABLE",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTikTokCommentToMessageSetting("tt_db_1")
    ).resolves.toEqual({ enabled: true, operationStatus: "ENABLE" });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.pathname).toBe(
      "/open_api/v1.3/business/message/direct_reply/get/"
    );
    expect(url.searchParams.get("direct_reply_type")).toBe(
      "COMMENT_TO_MESSAGE"
    );
    expect(dbMocks.update).toHaveBeenCalledWith({
      where: { id: "tt_db_1" },
      data: { commentToMessageEnabled: true },
    });
  });

  it("does not attempt Comment-to-Message when the account setting is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTikTokCommentDirectReply({
        tiktokAccountId: "tt_db_1",
        commentId: "comment_1",
        text: "Here is the info",
      })
    ).rejects.toMatchObject({
      code: "TIKTOK_COMMENT_TO_MESSAGE_DISABLED",
      status: 409,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses TikTok's direct_reply payload only after capability is verified", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({ commentToMessageEnabled: true })
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: { message: { message_id: "direct_1" } },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendTikTokCommentDirectReply({
        tiktokAccountId: "tt_db_1",
        commentId: "comment_1",
        text: "Here is the info",
      })
    ).resolves.toEqual({ messageId: "direct_1" });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      business_id: "open_123",
      message_type: "TEXT",
      text: { body: "Here is the info" },
      direct_reply: {
        reply_type: "COMMENT_REPLY",
        comment_reply: { comment_id: "comment_1" },
      },
    });
  });
});
