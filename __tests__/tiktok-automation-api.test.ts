import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const accessMocks = vi.hoisted(() => ({
  context: vi.fn(),
  canManage: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  accountFindFirst: vi.fn(),
  automationFindMany: vi.fn(),
  automationFindFirst: vi.fn(),
  automationCreate: vi.fn(),
  automationUpdate: vi.fn(),
  automationDelete: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: accessMocks.context,
  canManageWorkspace: accessMocks.canManage,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findFirst: dbMocks.accountFindFirst,
    },
    tikTokAutomation: {
      findMany: dbMocks.automationFindMany,
      findFirst: dbMocks.automationFindFirst,
      create: dbMocks.automationCreate,
      update: dbMocks.automationUpdate,
      delete: dbMocks.automationDelete,
    },
  },
}));

import {
  DELETE,
  PATCH,
  POST,
} from "../app/api/tiktok/automations/route";

function request(
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>,
  query = ""
) {
  return new NextRequest(`http://localhost/api/tiktok/automations${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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
  dbMocks.automationCreate.mockImplementation(({ data }) =>
    Promise.resolve({ id: "auto_1", ...data })
  );
  dbMocks.automationUpdate.mockImplementation(({ data }) =>
    Promise.resolve({ id: "auto_1", ...data })
  );
  dbMocks.automationDelete.mockResolvedValue({ id: "auto_1" });
});

describe("TikTok automation API", () => {
  it("fails closed when a comment campaign requests a capability the account lacks", async () => {
    dbMocks.accountFindFirst.mockResolvedValue({
      id: "tt_1",
      commentsEnabled: true,
      publicReplyEnabled: false,
      messagingEnabled: false,
    });

    const response = await POST(
      request("POST", {
        tiktokAccountId: "tt_1",
        name: "Comment info",
        videoId: "7203946942097902849",
        commentTriggerEnabled: true,
        keywords: ["INFO"],
        publicReplyEnabled: true,
        publicReplyMessage: "Напишіть INFO у Direct",
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringMatching(/public-reply capability/i),
    });
    expect(dbMocks.automationCreate).not.toHaveBeenCalled();
  });

  it("rejects a public comment reply longer than TikTok's 150-character limit", async () => {
    const response = await POST(
      request("POST", {
        tiktokAccountId: "tt_1",
        name: "Too long reply",
        videoId: "7203946942097902849",
        commentTriggerEnabled: true,
        keywords: ["INFO"],
        publicReplyEnabled: true,
        publicReplyMessage: "x".repeat(151),
      })
    );

    expect(response.status).toBe(400);
    expect(dbMocks.accountFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.automationCreate).not.toHaveBeenCalled();
  });

  it("creates a guarded inbound-DM campaign and clears irrelevant comment fields", async () => {
    dbMocks.accountFindFirst.mockResolvedValue({
      id: "tt_1",
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
    });

    const response = await POST(
      request("POST", {
        tiktokAccountId: "tt_1",
        name: "DM info",
        messageTriggerEnabled: true,
        keywords: [" INFO "],
        dmReplyEnabled: true,
        dmMessage: " Ось інформація ",
      })
    );

    expect(response.status).toBe(201);
    expect(dbMocks.automationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_1",
        messageTriggerEnabled: true,
        commentTriggerEnabled: false,
        videoId: null,
        keywords: ["INFO"],
        dmReplyEnabled: true,
        dmMessage: "Ось інформація",
        publicReplyEnabled: false,
        publicReplyMessage: null,
      }),
    });
  });

  it("rejects a message trigger that is configured without a reply action", async () => {
    const response = await POST(
      request("POST", {
        tiktokAccountId: "tt_1",
        name: "Broken DM",
        messageTriggerEnabled: true,
        keywords: ["INFO"],
        dmReplyEnabled: false,
      })
    );

    expect(response.status).toBe(400);
    expect(dbMocks.accountFindFirst).not.toHaveBeenCalled();
    expect(dbMocks.automationCreate).not.toHaveBeenCalled();
  });

  it("cannot patch a campaign outside the active workspace", async () => {
    dbMocks.automationFindFirst.mockResolvedValue(null);

    const response = await PATCH(
      request("PATCH", { name: "No access" }, "?id=other_workspace_auto")
    );

    expect(response.status).toBe(404);
    expect(dbMocks.automationUpdate).not.toHaveBeenCalled();
    expect(dbMocks.automationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "other_workspace_auto",
          workspaceId: "workspace_1",
        },
      })
    );
  });

  it("requires an owner/admin for destructive campaign changes", async () => {
    accessMocks.canManage.mockReturnValue(false);

    const response = await DELETE(
      request("DELETE", undefined, "?id=auto_1")
    );

    expect(response.status).toBe(403);
    expect(dbMocks.automationDelete).not.toHaveBeenCalled();
  });
});
