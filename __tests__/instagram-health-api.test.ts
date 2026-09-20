import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentWorkspaceId: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentWorkspaceId: mocks.getCurrentWorkspaceId,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    instagramAccount: {
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "../app/api/instagram/health/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCurrentWorkspaceId.mockResolvedValue("workspace_1");
  mocks.findMany.mockResolvedValue([]);
});

describe("Instagram health API", () => {
  it("requires an authenticated workspace", async () => {
    mocks.getCurrentWorkspaceId.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("scopes account health to the active workspace", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "ig_1",
        username: "replyhalo.demo",
        accessToken: "encrypted-token",
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        webhookSubscribed: true,
        connectedAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-20T00:00:00.000Z"),
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "workspace_1" } })
    );
    expect(payload.data[0]).toMatchObject({
      id: "ig_1",
      username: "replyhalo.demo",
      connected: true,
      webhookReady: true,
      overall: "READY",
    });
    expect(JSON.stringify(payload)).not.toContain("encrypted-token");
  });
});
