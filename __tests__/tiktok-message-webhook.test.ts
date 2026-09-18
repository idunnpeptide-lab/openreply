import { describe, expect, it } from "vitest";
import {
  normalizeTikTokInboundMessageEvent,
  parseTikTokInboundMessageContent,
} from "../lib/tiktok/message-webhook";

describe("TikTok inbound message webhook parsing", () => {
  it("parses and normalizes a text DM into the provider-neutral contract", () => {
    const parsed = parseTikTokInboundMessageContent(
      JSON.stringify({
        from: "maya",
        to: "brand",
        unique_identifier: "global_user_1",
        from_user: { role: "personal_account", id: "personal_1" },
        to_user: { role: "business_account", id: "business_1" },
        conversation_id: "conv+abc==",
        message_id: "msg_1",
        timestamp: 1_800_000_000_123,
        type: "text",
        text: { body: " GUIDE " },
        is_follower: true,
      })
    );

    expect(parsed).toMatchObject({
      conversationId: "conv+abc==",
      messageId: "msg_1",
      senderId: "global_user_1",
      senderUsername: "maya",
      text: "GUIDE",
      messageType: "text",
      isFollower: true,
    });

    expect(
      normalizeTikTokInboundMessageEvent({
        businessId: "open_123",
        message: parsed,
      })
    ).toEqual({
      platform: "TIKTOK",
      accountId: "open_123",
      conversationId: "conv+abc==",
      messageId: "msg_1",
      senderId: "global_user_1",
      senderUsername: "maya",
      text: "GUIDE",
      isFollower: true,
      createdAt: new Date(1_800_000_000_123).toISOString(),
    });
  });

  it("uses from_user.id only when stable unique_identifier is absent", () => {
    const parsed = parseTikTokInboundMessageContent(
      JSON.stringify({
        from: "maya",
        from_user: { role: "personal_account", id: "personal_fallback" },
        conversation_id: "conv_1",
        message_id: "msg_1",
        type: "text",
        text: { body: "START" },
      })
    );

    expect(parsed.senderId).toBe("personal_fallback");
  });

  it("acknowledges non-text messages without coercing them into keyword text", () => {
    const parsed = parseTikTokInboundMessageContent(
      JSON.stringify({
        unique_identifier: "global_user_1",
        conversation_id: "conv_1",
        message_id: "msg_2",
        type: "image",
        image: { media_id: "media_1" },
      })
    );

    expect(parsed.text).toBeNull();
    expect(
      normalizeTikTokInboundMessageEvent({
        businessId: "open_123",
        message: parsed,
      })
    ).toBeNull();
  });

  it("fails closed when reply identifiers are missing", () => {
    expect(() =>
      parseTikTokInboundMessageContent(
        JSON.stringify({
          unique_identifier: "global_user_1",
          message_id: "msg_1",
          type: "text",
          text: { body: "GUIDE" },
        })
      )
    ).toThrowError(/missing identifiers/);
  });
});
