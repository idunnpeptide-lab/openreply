import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma, mockContext, mockCanManage, mockEncrypt } = vi.hoisted(() => ({
  mockPrisma: {
    tikTokAccount: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    operationalEvent: {
      create: vi.fn(),
    },
  },
  mockContext: vi.fn(),
  mockCanManage: vi.fn(),
  mockEncrypt: vi.fn((value: string) => `enc:${value}`),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: mockContext,
  canManageWorkspace: mockCanManage,
}));

vi.mock("@/lib/tiktok/oauth", () => ({
  encryptTikTokToken: mockEncrypt,
}));

import { POST } from "../app/api/tiktok/disconnect/route";

function request(body: Record<string, unknown>) {
  return new NextRequest("https://replyhalo.example/api/tiktok/disconnect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockContext.mockResolvedValue({
    workspaceId: "workspace_123",
    role: "OWNER",
  });
  mockCanManage.mockReturnValue(true);
  mockPrisma.tikTokAccount.findFirst.mockResolvedValue({
    id: "tt_123",
    openId: "open_123",
    username: "replyhalo.demo",
  });
  mockPrisma.tikTokAccount.update.mockResolvedValue({});
  mockPrisma.operationalEvent.create.mockResolvedValue({});
});

describe("TikTok disconnect", () => {
  it("soft-disconnects without deleting campaigns or durable match history", async () => {
    const response = await POST(request({ tiktokAccountId: "tt_123" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: { preservedCampaignsAndHistory: true },
    });
    expect(mockPrisma.tikTokAccount.delete).not.toHaveBeenCalled();
    expect(mockPrisma.tikTokAccount.findFirst).toHaveBeenCalledWith({
      where: {
        id: "tt_123",
        workspaceId: "workspace_123",
        refreshTokenExpiresAt: { gt: expect.any(Date) },
      },
      select: {
        id: true,
        username: true,
        openId: true,
      },
    });
    expect(mockPrisma.tikTokAccount.update).toHaveBeenCalledWith({
      where: { id: "tt_123" },
      data: {
        accessTokenEncrypted: "enc:__REPLYHALO_TIKTOK_DISCONNECTED__",
        refreshTokenEncrypted: "enc:__REPLYHALO_TIKTOK_DISCONNECTED__",
        tokenExpiresAt: new Date(0),
        refreshTokenExpiresAt: new Date(0),
        grantedScopes: [],
        commentsEnabled: false,
        publicReplyEnabled: false,
        messagingEnabled: false,
        commentToMessageEnabled: false,
        webhookConfigured: false,
      },
    });
  });

  it("rejects requests without a TikTok account id", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(mockPrisma.tikTokAccount.update).not.toHaveBeenCalled();
  });

  it("requires owner/admin access", async () => {
    mockCanManage.mockReturnValue(false);

    const response = await POST(request({ tiktokAccountId: "tt_123" }));

    expect(response.status).toBe(403);
    expect(mockPrisma.tikTokAccount.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.tikTokAccount.update).not.toHaveBeenCalled();
  });
});
