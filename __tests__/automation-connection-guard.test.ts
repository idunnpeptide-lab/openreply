import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockPrisma,
  mockGetCurrentWorkspaceContext,
  mockCanManageWorkspace,
  mockGetCurrentWorkspaceId,
} = vi.hoisted(() => ({
  mockPrisma: {
    workspace: {
      findUnique: vi.fn(),
    },
    instagramAccount: {
      findFirst: vi.fn(),
    },
    automation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    trackedLink: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockGetCurrentWorkspaceContext: vi.fn(),
  mockCanManageWorkspace: vi.fn(),
  mockGetCurrentWorkspaceId: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: mockGetCurrentWorkspaceContext,
  canManageWorkspace: mockCanManageWorkspace,
}));

vi.mock("@/lib/auth", () => ({
  getCurrentWorkspaceId: mockGetCurrentWorkspaceId,
}));

import { PATCH, POST } from "../app/api/automations/route";

const workspaceId = "workspace_123";
const accountId = "instagram_123";

function createRequest(isActive: boolean) {
  return new NextRequest("https://replyhalo.example/api/automations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Launch automation",
      instagramAccountId: accountId,
      postId: "post_123",
      keywords: ["START"],
      dmMessage: "Here you go",
      isActive,
    }),
  });
}

function patchRequest(isActive: boolean) {
  return new NextRequest(
    "https://replyhalo.example/api/automations?id=automation_123",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive }),
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentWorkspaceContext.mockResolvedValue({
    workspaceId,
    role: "OWNER",
  });
  mockCanManageWorkspace.mockReturnValue(true);
  mockGetCurrentWorkspaceId.mockResolvedValue(workspaceId);
  mockPrisma.workspace.findUnique.mockResolvedValue({ id: workspaceId });
  mockPrisma.trackedLink.findFirst.mockResolvedValue(null);
  mockPrisma.trackedLink.findMany.mockResolvedValue([]);
});

describe("automation Instagram connection guard", () => {
  it("rejects creating an active automation on a soft-disconnected Instagram account", async () => {
    mockPrisma.instagramAccount.findFirst.mockResolvedValue({
      id: accountId,
      accessToken: "",
    });

    const response = await POST(createRequest(true));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      success: false,
      error: "INSTAGRAM_RECONNECT_REQUIRED",
    });
    expect(mockPrisma.automation.create).not.toHaveBeenCalled();
  });

  it("allows an inactive draft or duplicate to stay attached to the preserved account row", async () => {
    mockPrisma.instagramAccount.findFirst.mockResolvedValue({
      id: accountId,
      accessToken: "",
    });
    mockPrisma.automation.create.mockResolvedValue({
      id: "automation_123",
      isActive: false,
      instagramAccountId: accountId,
      trackedLinks: [],
    });

    const response = await POST(createRequest(false));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(mockPrisma.automation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instagramAccountId: accountId,
          isActive: false,
        }),
      })
    );
  });

  it("rejects reactivating an automation when its preserved Instagram account is disconnected", async () => {
    mockPrisma.automation.findFirst.mockResolvedValue({
      id: "automation_123",
      workspaceId,
      instagramAccountId: accountId,
      isActive: false,
    });
    mockPrisma.instagramAccount.findFirst.mockResolvedValue(null);

    const response = await PATCH(patchRequest(true));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      success: false,
      error: "INSTAGRAM_RECONNECT_REQUIRED",
    });
    expect(mockPrisma.automation.update).not.toHaveBeenCalled();
  });

  it("still allows pausing an active automation after the Instagram account disconnects", async () => {
    mockPrisma.automation.findFirst.mockResolvedValue({
      id: "automation_123",
      workspaceId,
      instagramAccountId: accountId,
      isActive: true,
    });
    mockPrisma.automation.update.mockResolvedValue({
      id: "automation_123",
      isActive: false,
    });

    const response = await PATCH(patchRequest(false));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockPrisma.instagramAccount.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.automation.update).toHaveBeenCalledWith({
      where: { id: "automation_123" },
      data: { isActive: false },
    });
  });
});
