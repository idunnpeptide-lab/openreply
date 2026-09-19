import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  matchFindUnique: vi.fn(),
  matchUpdate: vi.fn(),
  operationalCreate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: dbMocks.transaction,
  },
}));

vi.mock("@/lib/tiktok/client", () => ({
  replyToTikTokComment: vi.fn(),
}));

vi.mock("@/lib/tiktok/messaging", () => ({
  sendTikTokTextMessage: vi.fn(),
}));

import { createTikTokActionExecutor } from "../lib/tiktok/action-executor";

const FUTURE = new Date("2099-01-01T00:00:00.000Z");

const tx = {
  $queryRaw: dbMocks.queryRaw,
  tikTokAutomationMatch: {
    findUnique: dbMocks.matchFindUnique,
    update: dbMocks.matchUpdate,
  },
  operationalEvent: {
    create: dbMocks.operationalCreate,
  },
};

function baseMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "match_1",
    workspaceId: "workspace_1",
    tiktokAccountId: "tt_1",
    eventType: "COMMENT_INSERT",
    providerEventId: "comment_1",
    contentId: "video_1",
    conversationId: null,
    plan: {
      trigger: "COMMENT",
      actions: [{ type: "PUBLIC_REPLY", text: "Thanks" }],
      blocked: [],
    },
    status: "MATCHED",
    tiktokAccount: {
      refreshTokenExpiresAt: FUTURE,
      webhookConfigured: true,
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.transaction.mockImplementation(async (callback) => callback(tx));
  dbMocks.queryRaw.mockResolvedValue([{ id: "match_1" }]);
  dbMocks.matchFindUnique.mockResolvedValue(baseMatch());
  dbMocks.matchUpdate.mockResolvedValue({});
  dbMocks.operationalCreate.mockResolvedValue({});
});

describe("TikTok guarded action executor", () => {
  it("refuses all provider work while the live execution gate is locked", async () => {
    const publicReply = vi.fn();
    const dmReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: false,
      providers: { publicReply, dmReply },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "LOCKED",
      matchId: "match_1",
    });

    expect(dbMocks.transaction).not.toHaveBeenCalled();
    expect(publicReply).not.toHaveBeenCalled();
    expect(dmReply).not.toHaveBeenCalled();
  });

  it("serializes and executes one approved public reply, then marks the match terminal", async () => {
    const publicReply = vi.fn().mockResolvedValue({ comment_id: "reply_1" });
    const dmReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "EXECUTED",
      matchId: "match_1",
      providerActionId: "reply_1",
    });

    expect(dbMocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(publicReply).toHaveBeenCalledWith({
      tiktokAccountId: "tt_1",
      videoId: "video_1",
      commentId: "comment_1",
      text: "Thanks",
    });
    expect(dmReply).not.toHaveBeenCalled();
    expect(dbMocks.matchUpdate).toHaveBeenCalledWith({
      where: { id: "match_1" },
      data: { status: "EXECUTED" },
    });
  });

  it("does not replay an already-terminal match", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(baseMatch({ status: "EXECUTED" }));
    const publicReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "TERMINAL",
      matchId: "match_1",
      status: "EXECUTED",
    });
    expect(publicReply).not.toHaveBeenCalled();
    expect(dbMocks.matchUpdate).not.toHaveBeenCalled();
  });

  it("re-checks account capability immediately before a future live action", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(
      baseMatch({
        tiktokAccount: {
          refreshTokenExpiresAt: FUTURE,
          webhookConfigured: true,
          commentsEnabled: true,
          publicReplyEnabled: false,
          messagingEnabled: true,
        },
      })
    );
    const publicReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "SKIPPED",
      matchId: "match_1",
      reason: "PUBLIC_REPLY_CAPABILITY_DISABLED",
    });
    expect(publicReply).not.toHaveBeenCalled();
    expect(dbMocks.matchUpdate).toHaveBeenCalledWith({
      where: { id: "match_1" },
      data: { status: "SKIPPED" },
    });
  });

  it("re-checks the account connection inside the locked execution transaction", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(
      baseMatch({
        tiktokAccount: {
          refreshTokenExpiresAt: new Date(0),
          webhookConfigured: true,
          commentsEnabled: true,
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      })
    );
    const publicReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "SKIPPED",
      matchId: "match_1",
      reason: "ACCOUNT_DISCONNECTED",
    });
    expect(publicReply).not.toHaveBeenCalled();
  });

  it("re-checks real signed-webhook readiness inside the execution transaction", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(
      baseMatch({
        tiktokAccount: {
          refreshTokenExpiresAt: FUTURE,
          webhookConfigured: false,
          commentsEnabled: true,
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      })
    );
    const publicReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "SKIPPED",
      matchId: "match_1",
      reason: "WEBHOOK_DELIVERY_NOT_CONFIRMED",
    });
    expect(publicReply).not.toHaveBeenCalled();
  });

  it("executes only inside an existing inbound DM conversation", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(
      baseMatch({
        eventType: "MESSAGE_INBOUND",
        providerEventId: "msg_in_1",
        contentId: null,
        conversationId: "conv_1",
        plan: {
          trigger: "MESSAGE",
          actions: [{ type: "DM_REPLY", text: "Here you go" }],
          blocked: [],
        },
      })
    );
    const dmReply = vi.fn().mockResolvedValue({ messageId: "msg_out_1" });
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply: vi.fn(), dmReply },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "EXECUTED",
      matchId: "match_1",
      providerActionId: "msg_out_1",
    });
    expect(dmReply).toHaveBeenCalledWith({
      tiktokAccountId: "tt_1",
      conversationId: "conv_1",
      text: "Here you go",
    });
  });

  it("fails closed on an invalid stored action plan", async () => {
    dbMocks.matchFindUnique.mockResolvedValue(
      baseMatch({
        plan: {
          trigger: "COMMENT",
          actions: [
            { type: "PUBLIC_REPLY", text: "one" },
            { type: "PUBLIC_REPLY", text: "two" },
          ],
          blocked: [],
        },
      })
    );
    const publicReply = vi.fn();
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    const result = await execute("match_1");
    expect(result).toMatchObject({
      state: "FAILED",
      matchId: "match_1",
      code: "TIKTOK_EXECUTION_PLAN_INVALID",
    });
    expect(publicReply).not.toHaveBeenCalled();
    expect(dbMocks.matchUpdate).toHaveBeenCalledWith({
      where: { id: "match_1" },
      data: { status: "FAILED" },
    });
  });

  it("records provider failure without automatically retrying the send", async () => {
    const providerFailure = Object.assign(new Error("Provider unavailable"), {
      code: "TIKTOK_TEMPORARY_ERROR",
      status: 503,
    });
    const publicReply = vi.fn().mockRejectedValue(providerFailure);
    const execute = createTikTokActionExecutor({
      liveExecutionEnabled: true,
      providers: { publicReply, dmReply: vi.fn() },
    });

    await expect(execute("match_1")).resolves.toEqual({
      state: "FAILED",
      matchId: "match_1",
      code: "TIKTOK_TEMPORARY_ERROR",
      message: "Provider unavailable",
    });
    expect(publicReply).toHaveBeenCalledTimes(1);
    expect(dbMocks.matchUpdate).toHaveBeenCalledWith({
      where: { id: "match_1" },
      data: { status: "FAILED" },
    });
    expect(dbMocks.operationalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          level: "ERROR",
          message: "TikTok provider action failed",
        }),
      })
    );
  });
});
