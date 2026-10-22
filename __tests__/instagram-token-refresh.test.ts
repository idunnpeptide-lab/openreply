import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPrisma,
  mockDecryptToken,
  mockEncryptToken,
  mockRefreshLongLivedToken,
} = vi.hoisted(() => ({
  mockPrisma: {
    instagramAccount: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    operationalEvent: {
      create: vi.fn(),
    },
  },
  mockDecryptToken: vi.fn(),
  mockEncryptToken: vi.fn(),
  mockRefreshLongLivedToken: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/meta/oauth", () => ({
  decryptToken: mockDecryptToken,
  encryptToken: mockEncryptToken,
}));

vi.mock("@/lib/meta/client", () => ({
  refreshLongLivedToken: mockRefreshLongLivedToken,
}));

import { refreshExpiringInstagramTokens } from "../lib/instagram/token-refresh";

const NOW = new Date("2026-10-22T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.instagramAccount.findMany.mockResolvedValue([]);
  mockPrisma.instagramAccount.update.mockResolvedValue({});
  mockPrisma.operationalEvent.create.mockResolvedValue({});
  mockDecryptToken.mockReturnValue("decrypted-old-token");
  mockEncryptToken.mockReturnValue("encrypted-new-token");
  mockRefreshLongLivedToken.mockResolvedValue({
    accessToken: "new-long-lived-token",
    expiresIn: 60 * 24 * 60 * 60,
  });
});

describe("Instagram token refresh", () => {
  it("refreshes connected accounts whose tokens expire within ten days", async () => {
    mockPrisma.instagramAccount.findMany.mockResolvedValue([
      {
        id: "ig_row_1",
        workspaceId: "workspace_1",
        username: "creator",
        accessToken: "encrypted-old-token",
      },
    ]);

    const result = await refreshExpiringInstagramTokens({ now: NOW });

    expect(mockPrisma.instagramAccount.findMany).toHaveBeenCalledWith({
      where: {
        accessToken: { not: "" },
        tokenExpiresAt: {
          not: null,
          lte: new Date("2026-11-01T12:00:00.000Z"),
        },
      },
      select: {
        id: true,
        workspaceId: true,
        username: true,
        accessToken: true,
      },
    });
    expect(mockDecryptToken).toHaveBeenCalledWith("encrypted-old-token");
    expect(mockRefreshLongLivedToken).toHaveBeenCalledWith(
      "decrypted-old-token"
    );
    expect(mockEncryptToken).toHaveBeenCalledWith("new-long-lived-token");
    expect(mockPrisma.instagramAccount.update).toHaveBeenCalledWith({
      where: { id: "ig_row_1" },
      data: {
        accessToken: "encrypted-new-token",
        tokenExpiresAt: new Date("2026-12-21T12:00:00.000Z"),
      },
    });
    expect(result).toEqual({
      totalProcessed: 1,
      refreshed: 1,
      failed: 0,
      results: [
        {
          instagramAccountId: "ig_row_1",
          username: "creator",
          status: "refreshed",
        },
      ],
    });
  });

  it("records a diagnostic event and continues when Meta rejects a refresh", async () => {
    mockPrisma.instagramAccount.findMany.mockResolvedValue([
      {
        id: "ig_row_2",
        workspaceId: "workspace_2",
        username: "creator2",
        accessToken: "encrypted-old-token-2",
      },
    ]);
    mockRefreshLongLivedToken.mockRejectedValue(
      new Error("Meta token refresh rejected")
    );

    const result = await refreshExpiringInstagramTokens({ now: NOW });

    expect(mockPrisma.operationalEvent.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "workspace_2",
        source: "TOKEN_REFRESH",
        level: "ERROR",
        message:
          "Token refresh failed for @creator2: Meta token refresh rejected",
        payload: {
          instagramAccountId: "ig_row_2",
          username: "creator2",
        },
      },
    });
    expect(mockPrisma.instagramAccount.update).not.toHaveBeenCalled();
    expect(result.totalProcessed).toBe(1);
    expect(result.refreshed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.results[0]).toMatchObject({
      instagramAccountId: "ig_row_2",
      username: "creator2",
      status: "failed",
      error: "Meta token refresh rejected",
    });
  });

  it("does nothing when no token is inside the refresh window", async () => {
    const result = await refreshExpiringInstagramTokens({ now: NOW });

    expect(mockRefreshLongLivedToken).not.toHaveBeenCalled();
    expect(mockPrisma.instagramAccount.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      totalProcessed: 0,
      refreshed: 0,
      failed: 0,
      results: [],
    });
  });
});
