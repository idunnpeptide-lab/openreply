import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackPath,
  getAuthCallbackActionPath,
  parsePreviewSafeMagicLink,
  toPreviewSafeMagicLink,
} from "../lib/auth-magic-link";

describe("preview-safe magic links", () => {
  it("rewrites the token-consuming callback to an inert confirmation page", () => {
    const direct =
      "https://replyhalo.test/api/auth/callback/resend?callbackUrl=https%3A%2F%2Freplyhalo.test%2Fdashboard&token=test-token&email=user%40example.test";

    const safe = new URL(toPreviewSafeMagicLink(direct));

    expect(safe.origin).toBe("https://replyhalo.test");
    expect(safe.pathname).toBe("/auth/confirm");
    expect(safe.searchParams.get("provider")).toBe("resend");
    expect(safe.searchParams.get("token")).toBe("test-token");
    expect(safe.searchParams.get("email")).toBe("user@example.test");
    expect(safe.searchParams.get("callbackUrl")).toBe(
      "https://replyhalo.test/dashboard"
    );
  });

  it("rejects non-auth and incomplete callback URLs", () => {
    expect(() =>
      toPreviewSafeMagicLink("https://replyhalo.test/dashboard")
    ).toThrow("Unexpected Auth.js verification callback path");

    expect(() =>
      toPreviewSafeMagicLink(
        "https://replyhalo.test/api/auth/callback/resend?token=test-token"
      )
    ).toThrow("Incomplete Auth.js verification callback URL");
  });

  it("accepts only the configured email provider", () => {
    expect(
      parsePreviewSafeMagicLink(
        {
          provider: "resend",
          token: "test-token",
          email: "user@example.test",
          callbackUrl: "https://replyhalo.test/dashboard",
        },
        "resend"
      )
    ).toEqual({
      provider: "resend",
      token: "test-token",
      email: "user@example.test",
      callbackUrl: "https://replyhalo.test/dashboard",
    });

    expect(
      parsePreviewSafeMagicLink(
        {
          provider: "nodemailer",
          token: "test-token",
          email: "user@example.test",
        },
        "resend"
      )
    ).toBeNull();
  });

  it("builds a provider-scoped GET form action without token data", () => {
    expect(getAuthCallbackActionPath("resend")).toBe(
      "/api/auth/callback/resend"
    );
    expect(getAuthCallbackActionPath("provider/name")).toBe(
      "/api/auth/callback/provider%2Fname"
    );
  });

  it("reconstructs the real callback only after confirmation", () => {
    const callback = buildAuthCallbackPath({
      provider: "resend",
      token: "test-token",
      email: "user@example.test",
      callbackUrl: "https://replyhalo.test/dashboard",
    });
    const parsed = new URL(callback, "https://replyhalo.test");

    expect(parsed.pathname).toBe("/api/auth/callback/resend");
    expect(parsed.searchParams.get("token")).toBe("test-token");
    expect(parsed.searchParams.get("email")).toBe("user@example.test");
    expect(parsed.searchParams.get("callbackUrl")).toBe(
      "https://replyhalo.test/dashboard"
    );
  });
});
