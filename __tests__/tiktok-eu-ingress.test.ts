import { beforeEach, describe, expect, it, vi } from "vitest";

const licenseMocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  validate: vi.fn(),
}));
const resolverMocks = vi.hoisted(() => ({
  resolve: vi.fn(),
}));
const receiptMocks = vi.hoisted(() => ({
  persist: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    webhookEvent: { update: vi.fn() },
  },
}));

vi.mock("@/lib/dm-magnet-license", () => ({
  getDmMagnetLicenseServerConfig: licenseMocks.getConfig,
  validateDmMagnetWorkspaceLicense: licenseMocks.validate,
}));

vi.mock("@/lib/tiktok/eu-message-sync", () => ({
  resolveTikTokEuInboundMessage: resolverMocks.resolve,
}));

vi.mock("@/lib/social-event-receipts", () => ({
  persistSocialEventHandoff: receiptMocks.persist,
}));

import { processTikTokEuMessageSync } from "../lib/queue/tiktok-ingress";

beforeEach(() => {
  vi.resetAllMocks();
  licenseMocks.getConfig.mockReturnValue(null);
  receiptMocks.persist.mockResolvedValue("CREATED");
});

describe("TikTok EU message ingress", () => {
  it("resolves stripped webhook data before creating a durable routing handoff", async () => {
    resolverMocks.resolve.mockResolvedValue({
      platform: "TIKTOK",
      accountId: "open_123",
      conversationId: "conv_1",
      messageId: "msg_1",
      senderId: "global_user_1",
      senderUsername: "maya",
      text: "GUIDE",
      isFollower: null,
      createdAt: "2027-01-15T08:00:00.123Z",
    });

    await processTikTokEuMessageSync({
      data: {
        webhookEventId: "event_eu_1",
        workspaceId: "workspace_1",
        tiktokAccountId: "tt_db_1",
        businessId: "open_123",
        contentRaw: JSON.stringify({
          to: "brand",
          to_user: { role: "business_account", id: "business_1" },
          timestamp: 1_800_000_000_123,
        }),
      },
    } as unknown as Parameters<typeof processTikTokEuMessageSync>[0]);

    expect(resolverMocks.resolve).toHaveBeenCalledWith({
      tiktokAccountId: "tt_db_1",
      businessId: "open_123",
      timestamp: 1_800_000_000_123,
    });
    expect(receiptMocks.persist).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      platform: "TIKTOK",
      providerAccountId: "tt_db_1",
      eventType: "MESSAGE_INBOUND",
      providerEventId: "msg_1",
      webhookEventId: "event_eu_1",
      operationalMessage:
        "TikTok EU inbound message resolved and ready for automation routing",
      normalizedPayload: expect.objectContaining({
        platform: "TIKTOK",
        messageId: "msg_1",
        text: "GUIDE",
      }),
    });
  });

  it("does not create a receipt when correlation is ambiguous", async () => {
    resolverMocks.resolve.mockRejectedValue(
      new Error("multiple plausible TikTok messages")
    );

    await expect(
      processTikTokEuMessageSync({
        data: {
          webhookEventId: "event_eu_ambiguous",
          workspaceId: "workspace_1",
          tiktokAccountId: "tt_db_1",
          businessId: "open_123",
          contentRaw: JSON.stringify({
            timestamp: 1_800_000_000_123,
          }),
        },
      } as unknown as Parameters<typeof processTikTokEuMessageSync>[0])
    ).rejects.toThrow(/multiple plausible/);

    expect(receiptMocks.persist).not.toHaveBeenCalled();
  });
});
