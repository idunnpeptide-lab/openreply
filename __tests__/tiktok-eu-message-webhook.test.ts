import { describe, expect, it } from "vitest";
import { parseTikTokEuInboundMessageContent } from "../lib/tiktok/message-webhook";

describe("TikTok EU inbound message webhook", () => {
  it("keeps only the receiver context and timestamp TikTok actually provides", () => {
    expect(
      parseTikTokEuInboundMessageContent(
        JSON.stringify({
          to: "brand.account",
          to_user: { role: "business_account", id: "business_1" },
          timestamp: 1_800_000_000_123,
        })
      )
    ).toEqual({
      receiverUsername: "brand.account",
      receiverId: "business_1",
      timestamp: 1_800_000_000_123,
    });
  });

  it("fails closed when the provider timestamp is missing", () => {
    expect(() =>
      parseTikTokEuInboundMessageContent(
        JSON.stringify({
          to: "brand.account",
          to_user: { role: "business_account", id: "business_1" },
        })
      )
    ).toThrowError(/valid timestamp/);
  });
});
