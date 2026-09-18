import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

const oauthMocks = vi.hoisted(() => ({
  decrypt: vi.fn((value: string) => value.replace("enc:", "")),
  encrypt: vi.fn((value: string) => `enc:${value}`),
  refresh: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findUnique: dbMocks.findUnique,
      findFirst: dbMocks.findFirst,
      update: dbMocks.update,
    },
  },
}));

vi.mock("@/lib/tiktok/oauth", () => ({
  decryptTikTokToken: oauthMocks.decrypt,
  encryptTikTokToken: oauthMocks.encrypt,
  refreshTikTokAccessToken: oauthMocks.refresh,
}));

import {
  canConnectTikTokAccount,
  getTikTokCapabilitiesFromScopes,
  getValidTikTokAccessToken,
  TikTokAccountAuthError,
} from "../lib/tiktok/accounts";

const NOW = new Date("2026-09-18T20:00:00.000Z");

function accountFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "tt_db_1",
    workspaceId: "workspace_1",
    openId: "open_1",
    username: "replyhalo.demo",
    displayName: "ReplyHalo Demo",
    accessTokenEncrypted: "enc:access_old",
    refreshTokenEncrypted: "enc:refresh_old",
    tokenExpiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
    refreshTokenExpiresAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    grantedScopes: ["comment.list"],
    commentsEnabled: true,
    publicReplyEnabled: false,
    messagingEnabled: false,
    commentToMessageEnabled: false,
    webhookConfigured: false,
    connectedAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  oauthMocks.decrypt.mockImplementation((value: string) => value.replace("enc:", ""));
  oauthMocks.encrypt.mockImplementation((value: string) => `enc:${value}`);
});

describe("TikTok account lifecycle", () => {
  it("derives only capabilities directly guaranteed by granted scopes", () => {
    expect(
      getTikTokCapabilitiesFromScopes([
        "comment.list",
        "comment.list.manage",
        "message.list.read",
        "message.list.send",
      ])
    ).toEqual({
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
    });

    expect(getTikTokCapabilitiesFromScopes(["message.list.send"]).messagingEnabled)
      .toBe(false);
  });

  it("prevents the same TikTok account from being moved to another workspace", async () => {
    dbMocks.findUnique.mockResolvedValue({ workspaceId: "workspace_other" });

    await expect(
      canConnectTikTokAccount({ workspaceId: "workspace_1", openId: "open_1" })
    ).resolves.toEqual({ allowed: false, reason: "already_connected" });
  });

  it("uses the encrypted access token without refreshing while it is safely valid", async () => {
    dbMocks.findUnique.mockResolvedValue(accountFixture());

    await expect(getValidTikTokAccessToken("tt_db_1", NOW)).resolves.toBe(
      "access_old"
    );

    expect(oauthMocks.refresh).not.toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("refreshes an expiring access token and persists rotated encrypted tokens", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({ tokenExpiresAt: new Date(NOW.getTime() + 60_000) })
    );
    oauthMocks.refresh.mockResolvedValue({
      accessToken: "access_new",
      refreshToken: "refresh_new",
      expiresIn: 86400,
      refreshTokenExpiresIn: 31536000,
      openId: "open_1",
      scopes: [
        "comment.list",
        "comment.list.manage",
        "message.list.read",
        "message.list.send",
      ],
      tokenType: "Bearer",
    });
    dbMocks.update.mockResolvedValue({});

    await expect(getValidTikTokAccessToken("tt_db_1", NOW)).resolves.toBe(
      "access_new"
    );

    expect(oauthMocks.refresh).toHaveBeenCalledWith("refresh_old");
    expect(dbMocks.update).toHaveBeenCalledWith({
      where: { id: "tt_db_1" },
      data: expect.objectContaining({
        accessTokenEncrypted: "enc:access_new",
        refreshTokenEncrypted: "enc:refresh_new",
        grantedScopes: expect.arrayContaining(["comment.list.manage"]),
        commentsEnabled: true,
        publicReplyEnabled: true,
        messagingEnabled: true,
      }),
    });
  });

  it("fails before calling TikTok when the refresh token is expired", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({
        tokenExpiresAt: new Date(NOW.getTime() - 60_000),
        refreshTokenExpiresAt: new Date(NOW.getTime() - 1),
      })
    );

    await expect(getValidTikTokAccessToken("tt_db_1", NOW)).rejects.toMatchObject({
      code: "TIKTOK_REFRESH_TOKEN_EXPIRED",
    });
    expect(oauthMocks.refresh).not.toHaveBeenCalled();
  });

  it("rejects a refresh result for a different TikTok account", async () => {
    dbMocks.findUnique.mockResolvedValue(
      accountFixture({ tokenExpiresAt: new Date(NOW.getTime() - 60_000) })
    );
    oauthMocks.refresh.mockResolvedValue({
      accessToken: "access_new",
      refreshToken: "refresh_new",
      expiresIn: 86400,
      refreshTokenExpiresIn: 31536000,
      openId: "open_other",
      scopes: [],
      tokenType: "Bearer",
    });

    await expect(getValidTikTokAccessToken("tt_db_1", NOW)).rejects.toBeInstanceOf(
      TikTokAccountAuthError
    );
    expect(dbMocks.update).not.toHaveBeenCalled();
  });
});
