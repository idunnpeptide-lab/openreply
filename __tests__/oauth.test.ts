import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createOAuthState,
  decryptToken,
  encryptToken,
  verifyOAuthState,
} from "../lib/meta/oauth";

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_SECRET", "test-secret-with-enough-length");
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
});
