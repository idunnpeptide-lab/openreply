import { describe, expect, it } from "vitest";
import {
  getTikTokStagingReadiness,
  TIKTOK_LIVE_EXECUTION_ENABLED,
} from "../lib/tiktok/staging-readiness";

describe("TikTok staging readiness", () => {
  it("keeps live execution locked even when all provider capabilities are ready", () => {
    const readiness = getTikTokStagingReadiness({
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
      commentToMessageEnabled: true,
      webhookConfigured: true,
    });

    expect(TIKTOK_LIVE_EXECUTION_ENABLED).toBe(false);
    expect(readiness.commentCampaignReady).toBe(true);
    expect(readiness.dmCampaignReady).toBe(true);
    expect(readiness.commentToMessageReady).toBe(true);
    expect(readiness.webhookReady).toBe(true);
    expect(readiness.liveExecutionEnabled).toBe(false);
    expect(readiness.blockers).toContain(
      "ReplyHalo live TikTok execution is still locked for staging QA"
    );
  });

  it("fails closed for missing provider capabilities", () => {
    const readiness = getTikTokStagingReadiness({
      commentsEnabled: false,
      publicReplyEnabled: false,
      messagingEnabled: false,
      commentToMessageEnabled: false,
      webhookConfigured: false,
    });

    expect(readiness.commentCampaignReady).toBe(false);
    expect(readiness.dmCampaignReady).toBe(false);
    expect(readiness.commentToMessageReady).toBe(false);
    expect(readiness.webhookReady).toBe(false);
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "TikTok webhook configuration is not confirmed",
        "Comment access is not granted",
        "Public comment reply capability is not granted",
        "Business Messaging capability is not granted",
        "Comment-to-Message is not enabled for this account",
      ])
    );
  });

  it("does not mark comment-to-message ready from messaging alone", () => {
    const readiness = getTikTokStagingReadiness({
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
      commentToMessageEnabled: false,
      webhookConfigured: true,
    });

    expect(readiness.commentCampaignReady).toBe(true);
    expect(readiness.dmCampaignReady).toBe(true);
    expect(readiness.commentToMessageReady).toBe(false);
  });
});
