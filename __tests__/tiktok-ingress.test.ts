import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  webhookUpdate: vi.fn(),
}));
const licenseMocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  validate: vi.fn(),
}));
const lookupMocks = vi.hoisted(() => ({
  getComment: vi.fn(),
}));
const receiptMocks = vi.hoisted(() => ({
  persist: vi.fn(),
}));
const euMocks = vi.hoisted(() => ({
  resolve: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    webhookEvent: {
      update: dbMocks.webhookUpdate,
    },
  },
}));

vi.mock("@/lib/dm-magnet-license", () => ({
  getDmMagnetLicenseServerConfig: licenseMocks.getConfig,
  validateDmMagnetWorkspaceLicense: licenseMocks.validate,
}));

vi.mock("@/lib/tiktok/comment-lookup", () => ({
  getTikTokCommentById: lookupMocks.getComment,
}));

vi.mock("@/lib/social-event-receipts", () => ({
  persistSocialEventHandoff: receiptMocks.persist,
}));

vi.mock("@/lib/tiktok/eu-message-sync", () => ({
  resolveTikTokEuInboundMessage: euMocks.resolve,
}));

import {
  processTikTokCommentIngress,
  processTikTokEuMessageSync,
  processTikTokMessageIngress,
} from "../lib/queue/tiktok-ingress";

function commentJob(contentRaw: string) {
  return {
    data: {
      webhookEventId: "tiktok_event_1",
      workspaceId: "workspace_1",
      tiktokAccountId: "tt_db_1",
      businessId: "open_123",
      contentRaw,
    },
  } as unknown as Parameters<typeof processTikTokCommentIngress>[0];
}

function messageJob(contentRaw: string) {
  return {
    data: {
      webhookEventId: "tiktok_message_event_1",
      workspaceId: "workspace_1",
      tiktokAccountId: "tt_db_1",
      businessId: "open_123",
      contentRaw,
    },
  } as unknown as Parameters<typeof processTikTokMessageIngress>[0];
}

function euMessageJob(contentRaw: string) {
  return {
    data: {
      webhookEventId: "tiktok_eu_message_event_1",
      workspaceId: "workspace_1",
      tiktokAccountId: "tt_db_1",
      businessId: "open_123",
      contentRaw,
    },
  } as unknown as Parameters<typeof processTikTokEuMessageSync>[0];
}

beforeEach(() => {
  vi.resetAllMocks();
  licenseMocks.getConfig.mockReturnValue(null);
  dbMocks.webhookUpdate.mockResolvedValue({});
  receiptMocks.persist.mockResolvedValue("CREATED");
});

describe("TikTok comment ingress", () => {
  it("consumes non-insert updates without triggering comment lookup", async () => {
    await processTikTokCommentIngress(
      commentJob(
        '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"delete","timestamp":1800000000123}'
      )
    );

    expect(lookupMocks.getComment).not.toHaveBeenCalled();
    expect(receiptMocks.persist).not.toHaveBeenCalled();
    expect(dbMocks.webhookUpdate).toHaveBeenCalledWith({
      where: { id: "tiktok_event_1" },
      data: expect.objectContaining({
        status: "PROCESSED",
        errorMessage: null,
      }),
    });
  });

  it("resolves insert text and hands it to provider-level exactly-once persistence", async () => {
    lookupMocks.getComment.mockResolvedValue({
      comment_id: "7247303576418566913",
      video_id: "7203946942097902849",
      unique_identifier: "global_user_1",
      username: "maya",
      text: " GUIDE ",
      create_time: 1_800_000_000,
    });

    await processTikTokCommentIngress(
      commentJob(
        '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"insert","unique_identifier":"global_user_1","timestamp":1800000000123}'
      )
    );

    expect(lookupMocks.getComment).toHaveBeenCalledWith({
      tiktokAccountId: "tt_db_1",
      videoId: "7203946942097902849",
      commentId: "7247303576418566913",
    });
    expect(receiptMocks.persist).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      platform: "TIKTOK",
      providerAccountId: "tt_db_1",
      eventType: "COMMENT_INSERT",
      providerEventId: "7247303576418566913",
      webhookEventId: "tiktok_event_1",
      operationalMessage: "TikTok comment normalized and ready for automation routing",
      normalizedPayload: expect.objectContaining({
        platform: "TIKTOK",
        accountId: "open_123",
        contentId: "7203946942097902849",
        commentId: "7247303576418566913",
        authorId: "global_user_1",
        authorUsername: "maya",
        text: "GUIDE",
      }),
    });
  });

  it("retries instead of inventing data when exact comment lookup returns nothing", async () => {
    lookupMocks.getComment.mockResolvedValue(null);

    await expect(
      processTikTokCommentIngress(
        commentJob(
          '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"insert"}'
        )
      )
    ).rejects.toThrow(/was not returned by the comment lookup API/);

    expect(receiptMocks.persist).not.toHaveBeenCalled();
  });

  it("validates the workspace license before provider API work when licensing is enabled", async () => {
    licenseMocks.getConfig.mockReturnValue({
      baseUrl: "https://license.example.com",
      serviceSecret: null,
    });
    lookupMocks.getComment.mockResolvedValue(null);

    await expect(
      processTikTokCommentIngress(
        commentJob(
          '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"insert"}'
        )
      )
    ).rejects.toThrow();

    expect(licenseMocks.validate).toHaveBeenCalledWith("workspace_1");
  });
});

describe("TikTok message ingress", () => {
  it("normalizes inbound text DMs and dedupes by the provider message id", async () => {
    await processTikTokMessageIngress(
      messageJob(
        JSON.stringify({
          from: "maya",
          unique_identifier: "global_user_1",
          conversation_id: "conv+abc==",
          message_id: "msg_1",
          timestamp: 1_800_000_000_123,
          type: "text",
          text: { body: " START " },
          is_follower: false,
        })
      )
    );

    expect(receiptMocks.persist).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      platform: "TIKTOK",
      providerAccountId: "tt_db_1",
      eventType: "MESSAGE_INBOUND",
      providerEventId: "msg_1",
      webhookEventId: "tiktok_message_event_1",
      operationalMessage:
        "TikTok inbound message normalized and ready for automation routing",
      normalizedPayload: expect.objectContaining({
        platform: "TIKTOK",
        accountId: "open_123",
        conversationId: "conv+abc==",
        messageId: "msg_1",
        senderId: "global_user_1",
        senderUsername: "maya",
        text: "START",
        isFollower: false,
      }),
    });
  });

  it("marks non-text DMs processed without sending them into keyword routing", async () => {
    await processTikTokMessageIngress(
      messageJob(
        JSON.stringify({
          unique_identifier: "global_user_1",
          conversation_id: "conv_1",
          message_id: "msg_image",
          type: "image",
          image: { media_id: "media_1" },
        })
      )
    );

    expect(receiptMocks.persist).not.toHaveBeenCalled();
    expect(dbMocks.webhookUpdate).toHaveBeenCalledWith({
      where: { id: "tiktok_message_event_1" },
      data: expect.objectContaining({ status: "PROCESSED" }),
    });
  });

  it("uses the same provider message id for EU-reconciled DMs", async () => {
    euMocks.resolve.mockResolvedValue({
      platform: "TIKTOK",
      accountId: "open_123",
      conversationId: "conv_eu",
      messageId: "msg_shared_1",
      senderId: "global_user_eu",
      senderUsername: "maya",
      text: "START",
      isFollower: true,
      createdAt: new Date(1_800_000_000_123).toISOString(),
    });

    await processTikTokEuMessageSync(
      euMessageJob(
        JSON.stringify({
          to: "business",
          to_user: { role: "business_account", id: "open_123" },
          timestamp: 1_800_000_000_123,
        })
      )
    );

    expect(receiptMocks.persist).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "MESSAGE_INBOUND",
        providerEventId: "msg_shared_1",
        webhookEventId: "tiktok_eu_message_event_1",
      })
    );
  });
});
