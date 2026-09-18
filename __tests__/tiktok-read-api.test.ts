import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const accessMocks = vi.hoisted(() => ({
  context: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  accountFindMany: vi.fn(),
  accountFindFirst: vi.fn(),
}));
const clientMocks = vi.hoisted(() => ({
  listVideos: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: accessMocks.context,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findMany: dbMocks.accountFindMany,
      findFirst: dbMocks.accountFindFirst,
    },
  },
}));

vi.mock("@/lib/tiktok/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tiktok/client")>();
  return {
    ...actual,
    listTikTokVideos: clientMocks.listVideos,
  };
});

import { GET as getAccounts } from "../app/api/tiktok/accounts/route";
import { GET as getVideos } from "../app/api/tiktok/videos/route";
import { TikTokApiError } from "../lib/tiktok/client";

beforeEach(() => {
  vi.resetAllMocks();
  accessMocks.context.mockResolvedValue({
    userId: "user_1",
    workspaceId: "workspace_1",
    workspace: { id: "workspace_1" },
    role: "OWNER",
  });
  dbMocks.accountFindMany.mockResolvedValue([]);
});

describe("TikTok account read API", () => {
  it("lists only the active workspace's non-secret account metadata", async () => {
    dbMocks.accountFindMany.mockResolvedValue([
      {
        id: "tt_1",
        openId: "open_123",
        username: "brand",
        commentsEnabled: true,
        publicReplyEnabled: true,
        messagingEnabled: false,
      },
    ]);

    const response = await getAccounts();

    expect(response.status).toBe(200);
    expect(dbMocks.accountFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "workspace_1" },
        select: expect.not.objectContaining({
          accessTokenEncrypted: true,
          refreshTokenEncrypted: true,
        }),
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{ id: "tt_1", username: "brand" }],
    });
  });

  it("requires an authenticated workspace", async () => {
    accessMocks.context.mockResolvedValue(null);
    const response = await getAccounts();
    expect(response.status).toBe(401);
    expect(dbMocks.accountFindMany).not.toHaveBeenCalled();
  });
});

describe("TikTok owned-video read API", () => {
  it("loads owned videos only after verifying account ownership", async () => {
    dbMocks.accountFindFirst.mockResolvedValue({ id: "tt_1" });
    clientMocks.listVideos.mockResolvedValue({
      items: [{ item_id: "video_1", caption: "Demo" }],
      cursor: 10,
      hasMore: true,
    });

    const response = await getVideos(
      new NextRequest(
        "http://localhost/api/tiktok/videos?tiktokAccountId=tt_1&cursor=2&maxCount=10"
      )
    );

    expect(dbMocks.accountFindFirst).toHaveBeenCalledWith({
      where: { id: "tt_1", workspaceId: "workspace_1" },
      select: { id: true },
    });
    expect(clientMocks.listVideos).toHaveBeenCalledWith({
      tiktokAccountId: "tt_1",
      cursor: 2,
      maxCount: 10,
    });
    expect(response.status).toBe(200);
  });

  it("does not leak whether another workspace's account has videos", async () => {
    dbMocks.accountFindFirst.mockResolvedValue(null);

    const response = await getVideos(
      new NextRequest(
        "http://localhost/api/tiktok/videos?tiktokAccountId=other_workspace_tt"
      )
    );

    expect(response.status).toBe(404);
    expect(clientMocks.listVideos).not.toHaveBeenCalled();
  });

  it("surfaces official TikTok API failures without falling back to scraping", async () => {
    dbMocks.accountFindFirst.mockResolvedValue({ id: "tt_1" });
    clientMocks.listVideos.mockRejectedValue(
      new TikTokApiError(
        "TikTok video permission is not granted",
        "40001",
        403
      )
    );

    const response = await getVideos(
      new NextRequest(
        "http://localhost/api/tiktok/videos?tiktokAccountId=tt_1"
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "40001",
    });
  });

  it("rejects invalid pagination before provider work", async () => {
    const response = await getVideos(
      new NextRequest(
        "http://localhost/api/tiktok/videos?tiktokAccountId=tt_1&maxCount=999"
      )
    );

    expect(response.status).toBe(400);
    expect(dbMocks.accountFindFirst).not.toHaveBeenCalled();
    expect(clientMocks.listVideos).not.toHaveBeenCalled();
  });
});
