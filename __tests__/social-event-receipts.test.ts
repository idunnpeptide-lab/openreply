import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

const dbMocks = vi.hoisted(() => ({
  receiptCreate: vi.fn(),
  operationalCreate: vi.fn(),
  webhookUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    socialEventReceipt: {
      create: dbMocks.receiptCreate,
    },
    operationalEvent: {
      create: dbMocks.operationalCreate,
    },
    webhookEvent: {
      update: dbMocks.webhookUpdate,
    },
    $transaction: dbMocks.transaction,
  },
}));

import { persistSocialEventHandoff } from "../lib/social-event-receipts";

beforeEach(() => {
  vi.resetAllMocks();
  dbMocks.receiptCreate.mockResolvedValue({});
  dbMocks.operationalCreate.mockResolvedValue({});
  dbMocks.webhookUpdate.mockResolvedValue({});
  dbMocks.transaction.mockResolvedValue([]);
});

const input = {
  workspaceId: "workspace_1",
  platform: "TIKTOK" as const,
  providerAccountId: "tt_db_1",
  eventType: "MESSAGE_INBOUND",
  providerEventId: "msg_1",
  webhookEventId: "webhook_delivery_1",
  operationalMessage: "TikTok inbound message normalized and ready for automation routing",
  normalizedPayload: {
    platform: "TIKTOK",
    accountId: "open_123",
    conversationId: "conv_1",
    messageId: "msg_1",
    text: "START",
    optionalField: undefined,
  },
};

describe("provider event receipts", () => {
  it("persists the provider-native event id and routing handoff atomically", async () => {
    await expect(persistSocialEventHandoff(input)).resolves.toBe("CREATED");

    expect(dbMocks.receiptCreate).toHaveBeenCalledWith({
      data: {
        workspaceId: "workspace_1",
        platform: "TIKTOK",
        providerAccountId: "tt_db_1",
        eventType: "MESSAGE_INBOUND",
        providerEventId: "msg_1",
        webhookEventId: "webhook_delivery_1",
      },
    });
    expect(dbMocks.operationalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_1",
        source: "WORKER",
        level: "INFO",
        payload: expect.objectContaining({
          webhookEventId: "webhook_delivery_1",
          messageId: "msg_1",
          text: "START",
        }),
      }),
    });
    const operationalPayload = dbMocks.operationalCreate.mock.calls[0][0].data.payload;
    expect(operationalPayload).not.toHaveProperty("optionalField");
    expect(dbMocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("treats a P2002 receipt collision as an already-processed logical event", async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["platform", "providerAccountId", "eventType", "providerEventId"] },
      }
    );
    dbMocks.transaction.mockRejectedValueOnce(duplicate);

    await expect(persistSocialEventHandoff(input)).resolves.toBe("DUPLICATE");

    // One update is prepared for the transaction and the second explicitly
    // acknowledges the duplicate webhook delivery after the unique collision.
    expect(dbMocks.webhookUpdate).toHaveBeenCalledTimes(2);
    expect(dbMocks.webhookUpdate).toHaveBeenLastCalledWith({
      where: { id: "webhook_delivery_1" },
      data: expect.objectContaining({
        status: "PROCESSED",
        errorMessage: null,
      }),
    });
  });

  it("rethrows non-unique database failures so the queue can retry", async () => {
    dbMocks.transaction.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(persistSocialEventHandoff(input)).rejects.toThrow(
      "database unavailable"
    );
  });
});
