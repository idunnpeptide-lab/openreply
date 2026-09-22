import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOAuthState,
  decryptToken,
  encryptToken,
  exchangeShortLivedTokenForLongLived,
  verifyOAuthState,
} from "../lib/meta/oauth";

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-with-enough-length");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "test-instagram-app-secret");
  vi.stubEnv(
    "ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  );
});

describe("OAuth state and token encryption", () => {
  it("round-trips encrypted tokens", () => {
    const encrypted = encryptToken("long-lived-token");
    expect(encrypted).not.toBe("long-lived-token");
    expect(decryptToken(encrypted)).toBe("long-lived-token");
  });

  it("decrypts tokens written by the legacy AES-256-GCM format", () => {
    // Fixture produced by the pre-refactor encryptToken layout:
    // 16-byte IV + 16-byte auth tag + ciphertext, base64 encoded.
    const legacyCiphertext =
      "ABEiM0RVZneImaq7zN3u/z0bRH7r8Qn5Tb2Biiua0lcvfN8naIQgTNX07FIDi/2Q9BUZZVVZig==";

    expect(decryptToken(legacyCiphertext)).toBe("legacy-long-lived-token");
  });

  it("signs and verifies Instagram OAuth state", () => {
    const state = createOAuthState("workspace_123");
    expect(verifyOAuthState(state)?.workspaceId).toBe("workspace_123");
  });

  it("rejects tampered OAuth state", () => {
    const state = createOAuthState("workspace_123");
    expect(verifyOAuthState(`${state}tampered`)).toBeNull();
  });

  it("exchanges a short-lived token at the unversioned Instagram token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "long-lived-token",
          token_type: "bearer",
          expires_in: 5184000,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeShortLivedTokenForLongLived(
      "short-lived-token"
    );

    expect(result).toEqual({
      accessToken: "long-lived-token",
      expiresIn: 5184000,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin).toBe("https://graph.instagram.com");
    expect(url.pathname).toBe("/access_token");
    expect(url.pathname).not.toContain("/v25.0/");
    expect(url.searchParams.get("grant_type")).toBe("ig_exchange_token");
    expect(url.searchParams.get("client_secret")).toBe(
      "test-instagram-app-secret"
    );
    expect(url.searchParams.get("access_token")).toBe("short-lived-token");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("GET");
  });
});
