import { beforeEach, describe, expect, it, vi } from "vitest";

const messagingMocks = vi.hoisted(() => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock("@/lib/tiktok/messaging", () => ({
  listTikTokConversations: messagingMocks.listConversations,
  listTikTokMessages: messagingMocks.listMessages,
}));

import {
  resolveTikTokEuInboundMessage,
  TikTokEuMessageSyncError,
} from "../lib/tiktok/eu-message-sync";

const TS = 1_800_000_000_123;

beforeEach(() => {
  vi.resetAllMocks();
});

function conversations(items: Array<{ conversation_id: string; update_time: number }>) {
  return { items, cursor: items.length, hasMore: false };
}

describe("TikTok EU message reconciliation", () => {
  it("resolves exactly one inbound text message near the stripped webhook timestamp", async () => {
    messagingMocks.listConversations
      .mockResolvedValueOnce(
        conversations([{ conversation_id: "conv+abc==", update_time: TS + 500 }])
      )
      .mockResolvedValueOnce(conversations([]));
    messagingMocks.listMessages.mockResolvedValue({
      participants: [],
      messages: [
        {
          conversation_id: "conv+abc==",
          message_id: "msg_1",
          timestamp: TS,
          message_type: "TEXT",
          text: { body: " GUIDE " },
          sender: "maya",
          from_user: {
            role: "PERSONAL_ACCOUNT",
            unique_identifier: "global_user_1",
            username: "maya",
            is_follower: true,
          },
        },
      ],
    });

    await expect(
      resolveTikTokEuInboundMessage({
        tiktokAccountId: "tt_db_1",
        businessId: "open_123",
        timestamp: TS,
      })
    ).resolves.toEqual({
      platform: "TIKTOK",
      accountId: "open_123",
      conversationId: "conv+abc==",
      messageId: "msg_1",
      senderId: "global_user_1",
      senderUsername: "maya",
      text: "GUIDE",
      isFollower: true,
      createdAt: new Date(TS).toISOString(),
    });
  });

  it("ignores business-authored and non-text messages", async () => {
    messagingMocks.listConversations
      .mockResolvedValueOnce(
        conversations([{ conversation_id: "conv_1", update_time: TS }])
      )
      .mockResolvedValueOnce(conversations([]));
    messagingMocks.listMessages.mockResolvedValue({
      participants: [],
      messages: [
        {
          conversation_id: "conv_1",
          message_id: "outbound_1",
          timestamp: TS,
          message_type: "TEXT",
          text: { body: "business reply" },
          from_user: { role: "BUSINESS_ACCOUNT", id: "business_1" },
        },
        {
          conversation_id: "conv_1",
          message_id: "image_1",
          timestamp: TS,
          message_type: "IMAGE",
          from_user: { role: "PERSONAL_ACCOUNT", id: "personal_1" },
        },
      ],
    });

    await expect(
      resolveTikTokEuInboundMessage({
        tiktokAccountId: "tt_db_1",
        businessId: "open_123",
        timestamp: TS,
      })
    ).rejects.toMatchObject({ code: "TIKTOK_EU_MESSAGE_NOT_FOUND" });
  });

  it("fails closed when two plausible text messages match the same EU webhook", async () => {
    messagingMocks.listConversations
      .mockResolvedValueOnce(
        conversations([
          { conversation_id: "conv_1", update_time: TS },
          { conversation_id: "conv_2", update_time: TS + 100 },
        ])
      )
      .mockResolvedValueOnce(conversations([]));
    messagingMocks.listMessages.mockImplementation(
      ({ conversationId }: { conversationId: string }) =>
        Promise.resolve({
          participants: [],
          messages: [
            {
              conversation_id: conversationId,
              message_id: `msg_${conversationId}`,
              timestamp: TS,
              message_type: "TEXT",
              text: { body: "START" },
              from_user: {
                role: "PERSONAL_ACCOUNT",
                unique_identifier: `user_${conversationId}`,
              },
            },
          ],
        })
    );

    await expect(
      resolveTikTokEuInboundMessage({
        tiktokAccountId: "tt_db_1",
        businessId: "open_123",
        timestamp: TS,
      })
    ).rejects.toMatchObject({ code: "TIKTOK_EU_MESSAGE_AMBIGUOUS" });
  });

  it("refuses to fan out beyond the bounded conversation cap", async () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      conversation_id: `conv_${index}`,
      update_time: TS + index,
    }));
    messagingMocks.listConversations
      .mockResolvedValueOnce(conversations(many))
      .mockResolvedValueOnce(conversations([]));

    let caught: unknown;
    try {
      await resolveTikTokEuInboundMessage({
        tiktokAccountId: "tt_db_1",
        businessId: "open_123",
        timestamp: TS,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(TikTokEuMessageSyncError);
    expect(caught).toMatchObject({
      code: "TIKTOK_EU_MESSAGE_TOO_MANY_CONVERSATIONS",
    });
    expect(messagingMocks.listMessages).not.toHaveBeenCalled();
  });
});
