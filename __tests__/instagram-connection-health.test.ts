import { describe, expect, it } from "vitest";
import { getInstagramConnectionHealth } from "../lib/instagram/connection-health";

const NOW = new Date("2026-09-20T12:00:00.000Z");

describe("Instagram connection health", () => {
  it("marks a connected account with healthy token and webhook as ready", () => {
    expect(
      getInstagramConnectionHealth(
        {
          accessToken: "encrypted-token",
          tokenExpiresAt: new Date("2026-11-20T12:00:00.000Z"),
          webhookSubscribed: true,
        },
        NOW
      )
    ).toEqual({
      connected: true,
      token: "HEALTHY",
      webhookReady: true,
      overall: "READY",
      reasons: [],
    });
  });

  it("marks a token expiring within seven days as needing attention", () => {
    const health = getInstagramConnectionHealth(
      {
        accessToken: "encrypted-token",
        tokenExpiresAt: new Date("2026-09-24T12:00:00.000Z"),
        webhookSubscribed: true,
      },
      NOW
    );

    expect(health.overall).toBe("NEEDS_ATTENTION");
    expect(health.token).toBe("EXPIRING_SOON");
    expect(health.reasons).toContain("Instagram authorization expires soon");
  });

  it("fails closed when webhook readiness is missing", () => {
    const health = getInstagramConnectionHealth(
      {
        accessToken: "encrypted-token",
        tokenExpiresAt: new Date("2026-11-20T12:00:00.000Z"),
        webhookSubscribed: false,
      },
      NOW
    );

    expect(health.overall).toBe("NEEDS_ATTENTION");
    expect(health.webhookReady).toBe(false);
  });

  it("treats a preserved soft-disconnected account as disconnected", () => {
    const health = getInstagramConnectionHealth(
      {
        accessToken: "",
        tokenExpiresAt: null,
        webhookSubscribed: false,
      },
      NOW
    );

    expect(health.overall).toBe("DISCONNECTED");
    expect(health.connected).toBe(false);
  });
});
