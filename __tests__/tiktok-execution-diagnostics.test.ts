import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  matches: vi.fn(),
  events: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAutomationMatch: {
      findMany: dbMocks.matches,
    },
    operationalEvent: {
      findMany: dbMocks.events,
    },
  },
}));

import { getTikTokExecutionDiagnostics } from "../lib/tiktok/execution-diagnostics";

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.matches.mockResolvedValue([]);
  dbMocks.events.mockResolvedValue([]);
});

describe("TikTok execution diagnostics", () => {
  it("scopes both diagnostics queries to the active workspace", async () => {
    await getTikTokExecutionDiagnostics({
      workspaceId: "workspace_1",
      limit: 15,
    });

    expect(dbMocks.matches).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "workspace_1" },
        take: 15,
      })
    );
    expect(dbMocks.events).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "workspace_1",
          source: "WORKER",
          message: { startsWith: "TikTok" },
        },
        take: 15,
      })
    );
  });

  it("returns action types and diagnostic metadata without message text, actor data, or arbitrary payload fields", async () => {
    dbMocks.matches.mockResolvedValue([
      {
        id: "match_1",
        automationId: "auto_1",
        eventType: "COMMENT_INSERT",
        providerEventId: "comment_1",
        matchedKeyword: "INFO",
        inputText: "PRIVATE_COMMENT_TEXT",
        actorId: "private_actor_id",
        actorUsername: "private_username",
        conversationId: "private_conversation_id",
        plan: {
          trigger: "COMMENT",
          actions: [
            { type: "PUBLIC_REPLY", text: "SECRET_REPLY_TEXT" },
          ],
          blocked: [],
        },
        status: "MATCHED",
        createdAt: new Date("2026-09-19T08:00:00.000Z"),
        updatedAt: new Date("2026-09-19T08:01:00.000Z"),
        automation: { name: "Info campaign" },
      },
    ]);
    dbMocks.events.mockResolvedValue([
      {
        id: "event_1",
        level: "ERROR",
        message: "TikTok provider action failed",
        payload: {
          provider: "TIKTOK",
          matchId: "match_1",
          code: "TIKTOK_TEST_ERROR",
          status: 503,
          secret: "DO_NOT_RETURN",
          text: "SECRET_REPLY_TEXT",
          accessToken: "TOKEN_SHOULD_NEVER_RETURN",
        },
        createdAt: new Date("2026-09-19T08:02:00.000Z"),
        resolvedAt: null,
      },
    ]);

    const result = await getTikTokExecutionDiagnostics({
      workspaceId: "workspace_1",
    });
    const serialized = JSON.stringify(result);

    expect(result.matches[0]).toMatchObject({
      automationName: "Info campaign",
      matchedKeyword: "INFO",
      status: "MATCHED",
      plan: {
        trigger: "COMMENT",
        actionTypes: ["PUBLIC_REPLY"],
        blocked: [],
      },
    });
    expect(result.operationalEvents[0].payload).toEqual({
      matchId: "match_1",
      code: "TIKTOK_TEST_ERROR",
      status: 503,
    });

    expect(serialized).not.toContain("PRIVATE_COMMENT_TEXT");
    expect(serialized).not.toContain("private_actor_id");
    expect(serialized).not.toContain("private_username");
    expect(serialized).not.toContain("private_conversation_id");
    expect(serialized).not.toContain("SECRET_REPLY_TEXT");
    expect(serialized).not.toContain("DO_NOT_RETURN");
    expect(serialized).not.toContain("TOKEN_SHOULD_NEVER_RETURN");
  });

  it("caps large diagnostic requests to 50 rows", async () => {
    await getTikTokExecutionDiagnostics({
      workspaceId: "workspace_1",
      limit: 500,
    });

    expect(dbMocks.matches).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
    expect(dbMocks.events).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });
});
