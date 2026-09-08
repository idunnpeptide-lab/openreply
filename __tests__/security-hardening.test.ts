import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDmMagnetServiceAuthHeaders } from "../lib/dm-magnet-service-auth";
import {
  readRequestTextWithLimit,
  RequestBodyTooLargeError,
} from "../lib/http/read-limited-body";
import { isAllowedTrackedDestinationUrl } from "../lib/security/tracked-url";

describe("DM Magnet service authentication", () => {
  it("signs method, path, timestamp, nonce and body hash deterministically", () => {
    const secret = "service-secret";
    const body = JSON.stringify({ licenseKey: "DMM-SOLO-TEST" });
    const now = new Date("2026-09-08T12:00:00.000Z");
    const nonce = "nonce-123";

    const headers = buildDmMagnetServiceAuthHeaders({
      secret,
      method: "POST",
      path: "/api/licenses/validate",
      body,
      now,
      nonce,
    });

    const timestamp = String(Math.floor(now.getTime() / 1000));
    const bodyHash = createHash("sha256").update(body).digest("hex");
    const canonical = [
      "v1",
      timestamp,
      nonce,
      "POST",
      "/api/licenses/validate",
      bodyHash,
    ].join("\n");
    const expected = createHmac("sha256", secret)
      .update(canonical)
      .digest("hex");

    expect(headers["x-dm-magnet-timestamp"]).toBe(timestamp);
    expect(headers["x-dm-magnet-nonce"]).toBe(nonce);
    expect(headers["x-dm-magnet-signature"]).toBe(`v1=${expected}`);
  });
});

describe("bounded request body reader", () => {
  it("reads a normal request body", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "hello",
    });

    await expect(readRequestTextWithLimit(request, 10)).resolves.toBe("hello");
  });

  it("rejects a body larger than the configured limit", async () => {
    const request = new Request("https://example.test/webhook", {
      method: "POST",
      body: "0123456789",
    });

    await expect(readRequestTextWithLimit(request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
  });
});

describe("tracked redirect destinations", () => {
  it("accepts public HTTPS destinations", () => {
    expect(
      isAllowedTrackedDestinationUrl("https://example.com/path", {
        allowHttp: false,
      })
    ).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "file:///etc/passwd",
    "http://example.com",
    "https://localhost/test",
    "https://127.0.0.1/test",
    "https://10.0.0.2/test",
    "https://169.254.169.254/latest/meta-data/",
    "https://192.168.1.10/test",
    "https://metadata.google.internal/computeMetadata/v1/",
  ])("rejects unsafe destination %s", (url) => {
    expect(
      isAllowedTrackedDestinationUrl(url, { allowHttp: false })
    ).toBe(false);
  });
});
