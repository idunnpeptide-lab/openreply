import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  webhookUpdate: vi.fn(),
  operationalCreate: vi.fn(),
  transaction: vi.fn(),
}));
const licenseMocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  validate: vi.fn(),
}));
const lookupMocks = vi.hoisted(() => ({
  getComment: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    webhookEvent: {
      update: dbMocks.webhookUpdate,
    },
    operationalEvent: {
      create: dbMocks.operationalCreate,
    },
    $transaction: dbMocks.transaction,
  },
}));

vi.mock("@/lib/dm-magnet-license", () => ({
  getDmMagnetLicenseServerConfig: licenseMocks.getConfig,
  validateDmMagnetWorkspaceLicense: licenseMocks.validate,
}));

vi.mock("@/lib/tiktok/comment-lookup", () => ({
  getTikTokCommentById: lookupMocks.getComment,
}));

import {
  processTikTokCommentIngress,
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

beforeEach(() => {
  vi.resetAllMocks();
  licenseMocks.getConfig.mockReturnValue(null);
  dbMocks.webhookUpdate.mockReturnValue(Promise.resolve({}));
  dbMocks.operationalCreate.mockReturnValue(Promise.resolve({}));
  dbMocks.transaction.mockResolvedValue([]);
});

describe("TikTok comment ingress", () => {
  it("consumes non-insert updates without triggering comment lookup", async () => {
    await processTikTokCommentIngress(
      commentJob(
        '{"comment_id":7247303576418566913,"video_id":7203946942097902849,"comment_type":"comment","comment_action":"delete","timestamp":1800000000123}'
      )
    );

    expect(lookupMocks.getComment).not.toHaveBeenCalled();
    expect(dbMocks.webhookUpdate).toHaveBeenCalledWith({
      where: { id: "tiktok_event_1" },
      data: expect.objectContaining({
        status: "PROCESSED",
        errorMessage: null,
      }),
    });
  });

  it("resolves insert text, normalizes it, and records the provider-neutral event", async () => {
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
    expect(dbMocks.operationalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_1",
        source: "WORKER",
        level: "INFO",
        message: "TikTok comment normalized and ready for automation routing",
        payload: expect.objectContaining({
          webhookEventId: "tiktok_event_1",
          platform: "TIKTOK",
          accountId: "open_123",
          contentId: "7203946942097902849",
          commentId: "7247303576418566913",
          authorId: "global_user_1",
          authorUsername: "maya",
          text: "GUIDE",
        }),
      }),
    });
    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
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

    expect(dbMocks.transaction).not.toHaveBeenCalled();
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
  it("normalizes inbound text DMs and persists the routing handoff", async () => {
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

    expect(dbMocks.operationalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_1",
        source: "WORKER",
        level: "INFO",
        message: "TikTok inbound message normalized and ready for automation routing",
        payload: expect.objectContaining({
          webhookEventId: "tiktok_message_event_1",
          platform: "TIKTOK",
          accountId: "open_123",
          conversationId: "conv+abc==",
          messageId: "msg_1",
          senderId: "global_user_1",
          senderUsername: "maya",
          text: "START",
          isFollower: false,
        }),
      }),
    });
    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
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

    expect(dbMocks.operationalCreate).not.toHaveBeenCalled();
    expect(dbMocks.webhookUpdate).toHaveBeenCalledWith({
      where: { id: "tiktok_message_event_1" },
      data: expect.objectContaining({ status: "PROCESSED" }),
    });
  });
});
