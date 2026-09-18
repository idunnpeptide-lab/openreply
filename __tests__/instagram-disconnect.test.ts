import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockGetCurrentWorkspaceContext, mockCanManageWorkspace } =
  vi.hoisted(() => ({
    mockPrisma: {
      instagramAccount: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      operationalEvent: {
        create: vi.fn(),
      },
    },
    mockGetCurrentWorkspaceContext: vi.fn(),
    mockCanManageWorkspace: vi.fn(),
  }));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: mockGetCurrentWorkspaceContext,
  canManageWorkspace: mockCanManageWorkspace,
}));

import { POST } from "../app/api/instagram/disconnect/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentWorkspaceContext.mockResolvedValue({
    workspaceId: "workspace_123",
    role: "OWNER",
  });
  mockCanManageWorkspace.mockReturnValue(true);
  mockPrisma.instagramAccount.findFirst.mockResolvedValue({
    id: "account_123",
    username: "traffictiktok11",
  });
  mockPrisma.instagramAccount.update.mockResolvedValue({});
  mockPrisma.operationalEvent.create.mockResolvedValue({});
});

describe("Instagram disconnect", () => {
  it("soft-disconnects the account without deleting campaign history", async () => {
    const request = new NextRequest(
      "https://replyhalo.example/api/instagram/disconnect",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instagramAccountId: "account_123" }),
      }
    );

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: { preservedCampaignsAndHistory: true },
    });
    expect(mockPrisma.instagramAccount.findFirst).toHaveBeenCalledWith({
      where: {
        id: "account_123",
        workspaceId: "workspace_123",
      },
      select: {
        id: true,
        username: true,
      },
    });
    expect(mockPrisma.instagramAccount.update).toHaveBeenCalledWith({
      where: { id: "account_123" },
      data: {
        accessToken: "",
        tokenExpiresAt: null,
        webhookSubscribed: false,
      },
    });
  });

  it("rejects disconnect requests without an account id", async () => {
    const request = new NextRequest(
      "https://replyhalo.example/api/instagram/disconnect",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockPrisma.instagramAccount.update).not.toHaveBeenCalled();
  });
});
