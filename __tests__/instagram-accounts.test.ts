import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    instagramAccount: {
      findFirst: dbMocks.findFirst,
      findUnique: dbMocks.findUnique,
    },
  },
}));

import { getWorkspaceInstagramAccount } from "../lib/instagram-accounts";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getWorkspaceInstagramAccount", () => {
  it("requires a requested account to still be connected", async () => {
    dbMocks.findFirst.mockResolvedValue(null);

    await getWorkspaceInstagramAccount("workspace_1", "account_1");

    expect(dbMocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: "account_1",
        workspaceId: "workspace_1",
        accessToken: { not: "" },
      },
    });
  });

  it("uses only the latest connected account for the fallback path", async () => {
    dbMocks.findFirst.mockResolvedValue(null);

    await getWorkspaceInstagramAccount("workspace_2");

    expect(dbMocks.findFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace_2",
        accessToken: { not: "" },
      },
      orderBy: { connectedAt: "desc" },
    });
  });
});
