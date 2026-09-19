import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const accessMocks = vi.hoisted(() => ({
  context: vi.fn(),
  canManage: vi.fn(),
}));
const envMocks = vi.hoisted(() => ({
  baseUrl: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  matchFindFirst: vi.fn(),
}));
const executorMocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: accessMocks.context,
  canManageWorkspace: accessMocks.canManage,
}));

vi.mock("@/lib/env", () => ({
  getBaseUrl: envMocks.baseUrl,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAutomationMatch: {
      findFirst: dbMocks.matchFindFirst,
    },
  },
}));

vi.mock("@/lib/tiktok/action-executor", () => ({
  executeTikTokAutomationMatch: executorMocks.execute,
}));

import { POST } from "../app/api/admin/diagnostics/tiktok-execute-match/route";

const CONFIRMATION = "EXECUTE_TIKTOK_STAGING_MATCH";
const FUTURE = new Date("2099-01-01T00:00:00.000Z");

function request(body: Record<string, unknown>) {
  return new NextRequest(
    "https://replyhalo-web-staging.up.railway.app/api/admin/diagnostics/tiktok-execute-match",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function readyMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "match_1",
    status: "MATCHED",
    eventType: "COMMENT_INSERT",
    tiktokAccount: {
      refreshTokenExpiresAt: FUTURE,
      webhookConfigured: true,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  accessMocks.context.mockResolvedValue({
    userId: "user_1",
    workspaceId: "workspace_1",
    workspace: { id: "workspace_1" },
    role: "OWNER",
  });
  accessMocks.canManage.mockReturnValue(true);
  envMocks.baseUrl.mockReturnValue("https://replyhalo-web-staging.up.railway.app");
  dbMocks.matchFindFirst.mockResolvedValue(readyMatch());
});

describe("TikTok controlled staging execution API", () => {
  it("keeps a fully ready scoped match locked behind both source-controlled gates", async () => {
    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload).toEqual({
      success: false,
      error: "Controlled TikTok staging execution is locked",
      state: "LOCKED",
      matchId: "match_1",
      gates: {
        liveExecutionEnabled: false,
        controlledStagingSendEnabled: false,
      },
    });
    expect(dbMocks.matchFindFirst).toHaveBeenCalledWith({
      where: { id: "match_1", workspaceId: "workspace_1" },
      select: {
        id: true,
        status: true,
        eventType: true,
        tiktokAccount: {
          select: {
            refreshTokenExpiresAt: true,
            webhookConfigured: true,
          },
        },
      },
    });
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("requires the exact one-shot confirmation phrase before reading a match", async () => {
    const response = await POST(
      request({ matchId: "match_1", confirmation: "send it" })
    );

    expect(response.status).toBe(400);
    expect(dbMocks.matchFindFirst).not.toHaveBeenCalled();
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("does not reveal another workspace's match", async () => {
    dbMocks.matchFindFirst.mockResolvedValue(null);

    const response = await POST(
      request({ matchId: "other_match", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(404);
    expect(dbMocks.matchFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other_match", workspaceId: "workspace_1" },
      })
    );
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("refuses a terminal match before the executor", async () => {
    dbMocks.matchFindFirst.mockResolvedValue(
      readyMatch({ status: "EXECUTED" })
    );

    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      state: "TERMINAL",
      matchId: "match_1",
      status: "EXECUTED",
    });
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("requires an active TikTok connection before controlled execution", async () => {
    dbMocks.matchFindFirst.mockResolvedValue(
      readyMatch({
        tiktokAccount: {
          refreshTokenExpiresAt: new Date(0),
          webhookConfigured: true,
        },
      })
    );

    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      state: "BLOCKED",
      reason: "ACCOUNT_DISCONNECTED",
    });
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("requires real signed-delivery webhook readiness before controlled execution", async () => {
    dbMocks.matchFindFirst.mockResolvedValue(
      readyMatch({
        tiktokAccount: {
          refreshTokenExpiresAt: FUTURE,
          webhookConfigured: false,
        },
      })
    );

    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      state: "BLOCKED",
      reason: "WEBHOOK_DELIVERY_NOT_CONFIRMED",
    });
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("returns 404 outside staging", async () => {
    envMocks.baseUrl.mockReturnValue("https://app.replyhalo.com");

    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(404);
    expect(dbMocks.matchFindFirst).not.toHaveBeenCalled();
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });

  it("requires owner/admin access", async () => {
    accessMocks.canManage.mockReturnValue(false);

    const response = await POST(
      request({ matchId: "match_1", confirmation: CONFIRMATION })
    );

    expect(response.status).toBe(403);
    expect(dbMocks.matchFindFirst).not.toHaveBeenCalled();
    expect(executorMocks.execute).not.toHaveBeenCalled();
  });
});
