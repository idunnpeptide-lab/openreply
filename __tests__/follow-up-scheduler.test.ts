import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueueAdd } = vi.hoisted(() => ({
  mockQueueAdd: vi.fn(),
}));

vi.mock("@/lib/queue/client", () => ({
  FOLLOWUP_JOB_NAME: "process-followup",
  getDMQueue: () => ({ add: mockQueueAdd }),
}));

import { scheduleFollowUpIfEnabled } from "../lib/queue/follow-up";

const automation = {
  id: "auto_123",
  followUpEnabled: true,
  followUpMessage: "Thanks for checking this out",
  followUpDelayMinutes: 60,
  instagramAccount: {
    instagramId: "ig_456",
  },
};

describe("follow-up scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({ id: "followup_job" });
  });

  it("schedules a delayed follow-up after information is delivered", async () => {
    await expect(
      scheduleFollowUpIfEnabled({
        automation,
        userId: "user_789",
        commenterName: "customer",
      })
    ).resolves.toBe(true);

    expect(mockQueueAdd).toHaveBeenCalledWith(
      "process-followup",
      {
        instagramAccountId: "ig_456",
        userId: "user_789",
        automationId: "auto_123",
        commenterName: "customer",
      },
      {
        delay: 60 * 60_000,
        jobId: "followup_auto_123_user_789",
      }
    );
  });

  it("does not schedule when follow-up is disabled", async () => {
    await expect(
      scheduleFollowUpIfEnabled({
        automation: { ...automation, followUpEnabled: false },
        userId: "user_789",
        commenterName: null,
      })
    ).resolves.toBe(false);

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("does not schedule when the follow-up message is blank", async () => {
    await expect(
      scheduleFollowUpIfEnabled({
        automation: { ...automation, followUpMessage: "   " },
        userId: "user_789",
        commenterName: null,
      })
    ).resolves.toBe(false);

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
