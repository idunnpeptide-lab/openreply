import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAutomation: {
      findMany: dbMocks.findMany,
    },
    tikTokAutomationMatch: {
      createMany: dbMocks.createMany,
    },
  },
}));

import {
  routeTikTokCommentAutomation,
  routeTikTokMessageAutomation,
} from "../lib/tiktok/automation-routing";

const baseAutomation = {
  id: "tt_auto_1",
  keywords: ["INFO"],
  matchAnyWord: false,
  wholeWordMatch: true,
  publicReplyEnabled: true,
  publicReplyMessage: "Напишіть у Direct INFO",
  dmReplyEnabled: true,
  dmMessage: "Ось інформація",
  tiktokAccount: {
    publicReplyEnabled: true,
    messagingEnabled: true,
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.findMany.mockResolvedValue([]);
  dbMocks.createMany.mockImplementation(({ data }) =>
    Promise.resolve({ count: data.length })
  );
});

describe("TikTok comment automation routing", () => {
  it("scopes active campaigns to the account/video and snapshots a safe public-reply plan", async () => {
    dbMocks.findMany.mockResolvedValue([baseAutomation]);

    await expect(
      routeTikTokCommentAutomation({
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_db_1",
        event: {
          platform: "TIKTOK",
          accountId: "open_123",
          contentId: "video_123",
          commentId: "comment_123",
          authorId: "user_123",
          authorUsername: "maya",
          text: "INFO",
        },
      })
    ).resolves.toEqual({ matched: 1, inserted: 1 });

    expect(dbMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "workspace_1",
          tiktokAccountId: "tt_db_1",
          isActive: true,
          commentTriggerEnabled: true,
          OR: [{ matchAnyVideo: true }, { videoId: "video_123" }],
        }),
      })
    );

    const create = dbMocks.createMany.mock.calls[0][0];
    expect(create.skipDuplicates).toBe(true);
    expect(create.data).toEqual([
      expect.objectContaining({
        automationId: "tt_auto_1",
        eventType: "COMMENT_INSERT",
        providerEventId: "comment_123",
        matchedKeyword: "INFO",
        contentId: "video_123",
        actorId: "user_123",
        plan: {
          trigger: "COMMENT",
          actions: [
            { type: "PUBLIC_REPLY", text: "Напишіть у Direct INFO" },
          ],
          blocked: [],
        },
      }),
    ]);
  });

  it("records a blocked public reply instead of planning an unsupported provider action", async () => {
    dbMocks.findMany.mockResolvedValue([
      {
        ...baseAutomation,
        tiktokAccount: {
          publicReplyEnabled: false,
          messagingEnabled: true,
        },
      },
    ]);

    await routeTikTokCommentAutomation({
      workspaceId: "workspace_1",
      tiktokAccountId: "tt_db_1",
      event: {
        platform: "TIKTOK",
        accountId: "open_123",
        contentId: "video_123",
        commentId: "comment_123",
        authorId: "user_123",
        text: "info",
      },
    });

    expect(dbMocks.createMany.mock.calls[0][0].data[0].plan).toEqual({
      trigger: "COMMENT",
      actions: [],
      blocked: [
        { type: "PUBLIC_REPLY", reason: "ACCOUNT_CAPABILITY_DISABLED" },
      ],
    });
  });

  it("does not persist a route when the keyword does not match", async () => {
    dbMocks.findMany.mockResolvedValue([baseAutomation]);

    await expect(
      routeTikTokCommentAutomation({
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_db_1",
        event: {
          platform: "TIKTOK",
          accountId: "open_123",
          contentId: "video_123",
          commentId: "comment_123",
          authorId: "user_123",
          text: "hello",
        },
      })
    ).resolves.toEqual({ matched: 0, inserted: 0 });

    expect(dbMocks.createMany).not.toHaveBeenCalled();
  });
});

describe("TikTok inbound message automation routing", () => {
  it("plans only a reply inside the existing conversation when messaging is enabled", async () => {
    dbMocks.findMany.mockResolvedValue([baseAutomation]);

    await expect(
      routeTikTokMessageAutomation({
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_db_1",
        event: {
          platform: "TIKTOK",
          accountId: "open_123",
          conversationId: "conv_123",
          messageId: "msg_123",
          senderId: "user_123",
          senderUsername: "maya",
          text: "INFO",
          isFollower: false,
        },
      })
    ).resolves.toEqual({ matched: 1, inserted: 1 });

    expect(dbMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "workspace_1",
          tiktokAccountId: "tt_db_1",
          isActive: true,
          messageTriggerEnabled: true,
        },
      })
    );

    expect(dbMocks.createMany.mock.calls[0][0].data[0]).toEqual(
      expect.objectContaining({
        eventType: "MESSAGE_INBOUND",
        providerEventId: "msg_123",
        conversationId: "conv_123",
        plan: {
          trigger: "MESSAGE",
          actions: [{ type: "DM_REPLY", text: "Ось інформація" }],
          blocked: [],
        },
      })
    );
  });

  it("blocks the planned DM when the account lacks messaging capability", async () => {
    dbMocks.findMany.mockResolvedValue([
      {
        ...baseAutomation,
        tiktokAccount: {
          publicReplyEnabled: true,
          messagingEnabled: false,
        },
      },
    ]);

    await routeTikTokMessageAutomation({
      workspaceId: "workspace_1",
      tiktokAccountId: "tt_db_1",
      event: {
        platform: "TIKTOK",
        accountId: "open_123",
        conversationId: "conv_123",
        messageId: "msg_123",
        senderId: "user_123",
        text: "INFO",
      },
    });

    expect(dbMocks.createMany.mock.calls[0][0].data[0].plan).toEqual({
      trigger: "MESSAGE",
      actions: [],
      blocked: [{ type: "DM_REPLY", reason: "ACCOUNT_CAPABILITY_DISABLED" }],
    });
  });

  it("supports an explicit any-word trigger while preserving replay-safe inserts", async () => {
    dbMocks.findMany.mockResolvedValue([
      {
        ...baseAutomation,
        keywords: [],
        matchAnyWord: true,
      },
    ]);
    dbMocks.createMany.mockResolvedValue({ count: 0 });

    await expect(
      routeTikTokMessageAutomation({
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_db_1",
        event: {
          platform: "TIKTOK",
          accountId: "open_123",
          conversationId: "conv_123",
          messageId: "msg_duplicate",
          senderId: "user_123",
          text: "anything",
        },
      })
    ).resolves.toEqual({ matched: 1, inserted: 0 });

    expect(dbMocks.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });
});
