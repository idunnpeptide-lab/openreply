import { describe, expect, it } from "vitest";
import {
  buildQuickAutomationPayload,
  getQuickAutomationTemplate,
  QUICK_AUTOMATION_TEMPLATES,
} from "../lib/quick-automation-templates";

describe("quick automation templates", () => {
  it("ships four launch-safe templates", () => {
    expect(QUICK_AUTOMATION_TEMPLATES.map((item) => item.id)).toEqual([
      "comment-dm",
      "follow-gate",
      "tracked-link",
      "link-follow-up",
    ]);
  });

  it("builds a tracked-link payload without exposing arbitrary extra actions", () => {
    const template = getQuickAutomationTemplate("tracked-link");
    expect(template).not.toBeNull();

    const payload = buildQuickAutomationPayload({
      template: template!,
      instagramAccountId: "ig_account_1",
      postId: "post_1",
      postUrl: "https://instagram.com/p/test",
      campaignName: "Guide delivery",
      keyword: "GUIDE",
      publicReplyMessage: "Check your DM",
      dmMessage: "Here it is: {link}",
      trackedDestinationUrl: "https://example.com/guide",
    });

    expect(payload).toMatchObject({
      instagramAccountId: "ig_account_1",
      postId: "post_1",
      keywords: ["GUIDE"],
      dmMessage: "Here it is: {link}",
      trackedDestinationUrl: "https://example.com/guide",
      publicReplyEnabled: true,
      requireFollow: false,
      followUpEnabled: false,
      isActive: true,
    });
  });

  it("keeps the follow-gate template inside the existing supported flow", () => {
    const template = getQuickAutomationTemplate("follow-gate");
    expect(template).not.toBeNull();

    const payload = buildQuickAutomationPayload({
      template: template!,
      instagramAccountId: "ig_account_1",
      postId: "post_1",
      campaignName: "Follow gate",
      keyword: "START",
      publicReplyMessage: "Check your DMs",
      dmMessage: "Here you go",
    });

    expect(payload.requireFollow).toBe(true);
    expect(payload.followPromptMessage).toBeTruthy();
    expect(payload.followPromptButtonLabel).toBe("I'm following");
    expect(payload.dmTriggerEnabled).toBe(false);
  });

  it("keeps link follow-up delay within the existing 24-hour API limit", () => {
    const template = getQuickAutomationTemplate("link-follow-up");
    expect(template?.followUpEnabled).toBe(true);
    expect(template?.followUpDelayMinutes).toBeGreaterThanOrEqual(0);
    expect(template?.followUpDelayMinutes).toBeLessThanOrEqual(1440);
  });
});
