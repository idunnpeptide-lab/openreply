import { describe, expect, it } from "vitest";
import {
  REPLYHALO_PROVIDER_STAGE,
  SOCIAL_PROVIDER_CAPABILITIES,
} from "../lib/social-platform";
import {
  buildTikTokBusinessAuthorizationUrl,
  getTikTokBusinessConfig,
  REPLYHALO_TIKTOK_COMMENT_STAGING_SCOPES,
  REPLYHALO_TIKTOK_DESIRED_SCOPES,
  REPLYHALO_TIKTOK_MESSAGING_SCOPES,
  TIKTOK_SHORT_TERM_TOKEN_ENDPOINT,
} from "../lib/tiktok/config";

describe("TikTok provider foundation", () => {
  it("keeps Instagram live while TikTok is additive foundation work", () => {
    expect(REPLYHALO_PROVIDER_STAGE.INSTAGRAM).toBe("LIVE");
    expect(REPLYHALO_PROVIDER_STAGE.TIKTOK).toBe("FOUNDATION");
  });

  it("marks TikTok messaging capability as account dependent", () => {
    expect(SOCIAL_PROVIDER_CAPABILITIES.TIKTOK.comments).toBe("SUPPORTED");
    expect(SOCIAL_PROVIDER_CAPABILITIES.TIKTOK.publicReply).toBe("SUPPORTED");
    expect(SOCIAL_PROVIDER_CAPABILITIES.TIKTOK.directMessage).toBe(
      "ACCOUNT_DEPENDENT"
    );
    expect(SOCIAL_PROVIDER_CAPABILITIES.TIKTOK.commentToMessage).toBe(
      "ACCOUNT_DEPENDENT"
    );
  });

  it("builds the TikTok for Business authorization URL", () => {
    const url = new URL(
      buildTikTokBusinessAuthorizationUrl({
        appId: "app_123",
        redirectUri: "https://replyhalo.example/api/tiktok/callback",
        state: "signed-state",
        scopes: ["video.list", "comment.list"],
      })
    );

    expect(url.origin + url.pathname).toBe(
      "https://ads.tiktok.com/marketing_api/auth"
    );
    expect(url.searchParams.get("app_id")).toBe("app_123");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://replyhalo.example/api/tiktok/callback"
    );
    expect(url.searchParams.get("scope")).toBe("video.list,comment.list");
  });

  it("returns null until all required TikTok app configuration is present", () => {
    expect(
      getTikTokBusinessConfig({
        TIKTOK_BUSINESS_APP_ID: "app_123",
        TIKTOK_BUSINESS_APP_SECRET: undefined,
        TIKTOK_BUSINESS_REDIRECT_URI:
          "https://replyhalo.example/api/tiktok/callback",
        TIKTOK_BUSINESS_SCOPES: undefined,
      })
    ).toBeNull();
  });

  it("uses the least-privilege comment staging baseline by default", () => {
    const config = getTikTokBusinessConfig({
      TIKTOK_BUSINESS_APP_ID: "app_123",
      TIKTOK_BUSINESS_APP_SECRET: "secret_123",
      TIKTOK_BUSINESS_REDIRECT_URI:
        "https://replyhalo.example/api/tiktok/callback",
      TIKTOK_BUSINESS_SCOPES: undefined,
    });

    expect(config?.scopes).toEqual([...REPLYHALO_TIKTOK_DESIRED_SCOPES]);
    expect(REPLYHALO_TIKTOK_DESIRED_SCOPES).toEqual([
      ...REPLYHALO_TIKTOK_COMMENT_STAGING_SCOPES,
    ]);
    for (const scope of REPLYHALO_TIKTOK_MESSAGING_SCOPES) {
      expect(config?.scopes).not.toContain(scope);
    }
    expect(TIKTOK_SHORT_TERM_TOKEN_ENDPOINT).toBe(
      "https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/"
    );
  });

  it("allows approved extra scopes only through an explicit override", () => {
    const config = getTikTokBusinessConfig({
      TIKTOK_BUSINESS_APP_ID: "app_123",
      TIKTOK_BUSINESS_APP_SECRET: "secret_123",
      TIKTOK_BUSINESS_REDIRECT_URI:
        "https://replyhalo.example/api/tiktok/callback",
      TIKTOK_BUSINESS_SCOPES:
        "user.info.basic,video.list,comment.list,comment.list.manage,message.list.read,message.list.send",
    });

    expect(config?.scopes).toEqual([
      "user.info.basic",
      "video.list",
      "comment.list",
      "comment.list.manage",
      "message.list.read",
      "message.list.send",
    ]);
  });
});
