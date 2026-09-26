import { describe, expect, it } from "vitest";
import {
  isTikTokReviewDemoAvailable,
  TIKTOK_REVIEW_DEMO_ACCOUNT,
  TIKTOK_REVIEW_DEMO_NOTICE,
  TIKTOK_REVIEW_DEMO_PATH,
  TIKTOK_REVIEW_DEMO_VIDEOS,
} from "../lib/tiktok/review-demo";

describe("TikTok review demo", () => {
  it("is available in staging and local development", () => {
    expect(
      isTikTokReviewDemoAvailable({
        NODE_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "staging",
      })
    ).toBe(true);

    expect(
      isTikTokReviewDemoAvailable({
        NODE_ENV: "development",
        RAILWAY_ENVIRONMENT_NAME: undefined,
      })
    ).toBe(true);
  });

  it("is hidden from production", () => {
    expect(
      isTikTokReviewDemoAvailable({
        NODE_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "production",
      })
    ).toBe(false);
  });

  it("uses only explicit demo identities and data", () => {
    expect(TIKTOK_REVIEW_DEMO_PATH).toBe("/tiktok/review-demo");
    expect(TIKTOK_REVIEW_DEMO_ACCOUNT.username).toBe("replyhalo_demo");
    expect(TIKTOK_REVIEW_DEMO_VIDEOS.length).toBeGreaterThan(0);
    expect(TIKTOK_REVIEW_DEMO_NOTICE).toContain("never calls TikTok APIs");
  });
});
