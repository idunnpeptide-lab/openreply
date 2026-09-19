import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      updateMany,
    },
  },
}));

import { confirmTikTokWebhookReadiness } from "../lib/tiktok/webhook-readiness";

beforeEach(() => {
  vi.resetAllMocks();
  updateMany.mockResolvedValue({ count: 1 });
});

describe("TikTok webhook readiness confirmation", () => {
  it.each(["comment.update", "im_receive_msg", "im_receive_msg_eu"])(
    "confirms supported signed ingress event %s idempotently",
    async (event) => {
      const result = await confirmTikTokWebhookReadiness({
        tiktokAccountId: "tt_account_1",
        event,
      });

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "tt_account_1",
          webhookConfigured: false,
        },
        data: { webhookConfigured: true },
      });
      expect(result).toEqual({ confirmed: true, changed: true });
    }
  );

  it("does not confirm readiness for unsupported events", async () => {
    const result = await confirmTikTokWebhookReadiness({
      tiktokAccountId: "tt_account_1",
      event: "video.publish",
    });

    expect(updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ confirmed: false, changed: false });
  });

  it("is idempotent once webhook readiness was already confirmed", async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });

    const result = await confirmTikTokWebhookReadiness({
      tiktokAccountId: "tt_account_1",
      event: "comment.update",
    });

    expect(result).toEqual({ confirmed: true, changed: false });
  });
});
