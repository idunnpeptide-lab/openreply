import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTikTokOAuthState,
  exchangeTikTokAuthCode,
  getTikTokAuthorizationUrl,
  getTikTokBusinessProfile,
  parseTikTokScopes,
  verifyTikTokOAuthState,
} from "../lib/tiktok/oauth";
import { TIKTOK_SHORT_TERM_TOKEN_ENDPOINT } from "../lib/tiktok/config";

const TEST_SECRET = "test-secret-with-enough-length";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
  vi.stubEnv("TIKTOK_BUSINESS_APP_ID", "app_123");
  vi.stubEnv("TIKTOK_BUSINESS_APP_SECRET", "secret_456");
  vi.stubEnv(
    "TIKTOK_BUSINESS_REDIRECT_URI",
    "https://app.replyhalo.example/api/tiktok/callback"
  );
  vi.stubEnv(
    "TIKTOK_BUSINESS_SCOPES",
    "user.info.basic,user.info.username,comment.list,comment.list.manage"
  );
});

describe("TikTok OAuth", () => {
  it("signs and verifies workspace-bound state", () => {
    const state = createTikTokOAuthState("workspace_123");
    expect(verifyTikTokOAuthState(state)).toMatchObject({
      workspaceId: "workspace_123",
      provider: "TIKTOK",
    });
  });

  it("rejects a tampered state", () => {
    const state = createTikTokOAuthState("workspace_123");
    expect(verifyTikTokOAuthState(`${state}tampered`)).toBeNull();
  });

  it("builds the TikTok for Business account-holder authorization URL", () => {
    const url = new URL(getTikTokAuthorizationUrl("signed-state"));

    expect(url.origin + url.pathname).toBe(
      "https://ads.tiktok.com/marketing_api/auth"
    );
    expect(url.searchParams.get("app_id")).toBe("app_123");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.replyhalo.example/api/tiktok/callback"
    );
    expect(url.searchParams.get("scope")).toContain("comment.list.manage");
  });

  it("exchanges auth_code through the official short-term token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            access_token: "access_123",
            refresh_token: "refresh_123",
            expires_in: 86400,
            refresh_token_expires_in: 31536000,
            open_id: "open_123",
            scope:
              "comment.list,comment.list.manage,message.list.read,message.list.send",
            token_type: "Bearer",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeTikTokAuthCode("auth_code_123");

    expect(result).toMatchObject({
      accessToken: "access_123",
      refreshToken: "refresh_123",
      openId: "open_123",
      expiresIn: 86400,
      refreshTokenExpiresIn: 31536000,
    });
    expect(result.scopes).toContain("message.list.send");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      TIKTOK_SHORT_TERM_TOKEN_ENDPOINT
    );

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      client_id: "app_123",
      client_secret: "secret_456",
      grant_type: "authorization_code",
      auth_code: "auth_code_123",
      redirect_uri: "https://app.replyhalo.example/api/tiktok/callback",
    });
  });

  it("loads the authorized TikTok Business profile with Access-Token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: "OK",
          data: {
            business_id: "open_123",
            username: "replyhalo.demo",
            display_name: "ReplyHalo Demo",
            profile_image: "https://example.com/avatar.jpg",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTikTokBusinessProfile({
        accessToken: "access_123",
        openId: "open_123",
      })
    ).resolves.toEqual({
      openId: "open_123",
      username: "replyhalo.demo",
      displayName: "ReplyHalo Demo",
      profileImage: "https://example.com/avatar.jpg",
    });

    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestedUrl.pathname).toContain("/open_api/v1.3/business/get/");
    expect(requestedUrl.searchParams.get("business_id")).toBe("open_123");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["Access-Token"]).toBe(
      "access_123"
    );
  });

  it("deduplicates granted scopes", () => {
    expect(parseTikTokScopes("comment.list, comment.list,message.list.send"))
      .toEqual(["comment.list", "message.list.send"]);
  });
});
