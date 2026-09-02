import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindDmMagnetInstagramAccount,
  DmMagnetLicenseError,
  getDmMagnetLicenseConfig,
  licenseErrorToSettingsCode,
  validateDmMagnetLicense,
} from "../lib/dm-magnet-license";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DM Magnet license client", () => {
  it("stays disabled when both license environment variables are absent", async () => {
    expect(getDmMagnetLicenseConfig()).toBeNull();
    await expect(validateDmMagnetLicense({ force: true })).resolves.toBeNull();
    await expect(
      bindDmMagnetInstagramAccount({
        instagramAccountId: "ig_123",
      })
    ).resolves.toBeNull();
  });

  it("rejects partial or invalid configuration", () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");

    expect(() => getDmMagnetLicenseConfig()).toThrowError(
      DmMagnetLicenseError
    );

    try {
      getDmMagnetLicenseConfig();
      throw new Error("expected partial config to fail");
    } catch (error) {
      expect(error).toMatchObject({
        code: "LICENSE_SERVICE_MISCONFIGURED",
      });
    }

    vi.stubEnv("DM_MAGNET_LICENSE_KEY", "DMM-SOLO-TEST");
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "not-a-url");

    expect(() => getDmMagnetLicenseConfig()).toThrowError(
      DmMagnetLicenseError
    );
  });

  it("validates an active license through the central server", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("DM_MAGNET_LICENSE_KEY", "DMM-SOLO-VALID-KEY");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          license: {
            valid: true,
            id: "lic_1",
            status: "ACTIVE",
            plan: "SOLO",
            maxAccounts: 1,
            usedAccounts: 0,
            availableAccounts: 1,
            expiresAt: null,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDmMagnetLicense({ force: true });

    expect(result).toMatchObject({
      valid: true,
      status: "ACTIVE",
      plan: "SOLO",
      maxAccounts: 1,
      usedAccounts: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://license.example.com/api/licenses/validate"
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      "DMM-SOLO-VALID-KEY"
    );
  });

  it("surfaces account-limit errors from Instagram binding", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("DM_MAGNET_LICENSE_KEY", "DMM-SOLO-LIMITED-KEY");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "ACCOUNT_LIMIT_REACHED",
            message: "Instagram account limit reached for this license",
          }),
          {
            status: 409,
            headers: { "content-type": "application/json" },
          }
        )
      )
    );

    await expect(
      bindDmMagnetInstagramAccount({
        instagramAccountId: "ig_second",
        instagramUsername: "second.account",
        instanceId: "instance_1",
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_LIMIT_REACHED",
      status: 409,
    });
  });

  it("maps central license errors to safe Settings query codes", () => {
    expect(
      licenseErrorToSettingsCode(
        new DmMagnetLicenseError(
          "revoked",
          "LICENSE_REVOKED",
          403
        )
      )
    ).toBe("revoked");

    expect(
      licenseErrorToSettingsCode(
        new DmMagnetLicenseError(
          "down",
          "LICENSE_SERVICE_UNAVAILABLE",
          503
        )
      )
    ).toBe("unavailable");
  });
});
