import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  workspaceFindUnique: vi.fn(),
  workspaceUpdate: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    workspace: {
      findUnique: dbMocks.workspaceFindUnique,
      update: dbMocks.workspaceUpdate,
    },
  },
}));

import {
  bindDmMagnetInstagramAccount,
  configureDmMagnetWorkspaceLicense,
  DmMagnetLicenseError,
  getDmMagnetLicenseServerConfig,
  licenseErrorToSettingsCode,
  validateDmMagnetWorkspaceLicense,
} from "../lib/dm-magnet-license";
import { encryptSecret } from "../lib/secret-crypto";

const TEST_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function activeLicenseResponse() {
  return new Response(
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
  );
}

describe("DM Magnet workspace license client", () => {
  it("stays disabled when the central License Server URL is absent", async () => {
    expect(getDmMagnetLicenseServerConfig()).toBeNull();

    await expect(
      validateDmMagnetWorkspaceLicense("workspace_disabled", { force: true })
    ).resolves.toBeNull();

    expect(dbMocks.workspaceFindUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid License Server URL", () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "not-a-url");

    expect(() => getDmMagnetLicenseServerConfig()).toThrowError(
      DmMagnetLicenseError
    );
  });

  it("validates before storing a workspace License Key and encrypts it at rest", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);

    const fetchMock = vi.fn().mockResolvedValue(activeLicenseResponse());
    vi.stubGlobal("fetch", fetchMock);
    dbMocks.workspaceUpdate.mockResolvedValue({});

    const plaintextKey = "DMM-SOLO-VALID-KEY";
    const result = await configureDmMagnetWorkspaceLicense(
      "workspace_configure",
      plaintextKey
    );

    expect(result).toMatchObject({
      valid: true,
      status: "ACTIVE",
      plan: "SOLO",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://license.example.com/api/licenses/validate"
    );

    const updateArgs = dbMocks.workspaceUpdate.mock.calls[0]?.[0];
    expect(updateArgs.where).toEqual({ id: "workspace_configure" });
    expect(updateArgs.data.dmMagnetLicenseKeyEncrypted).not.toBe(plaintextKey);
    expect(updateArgs.data.dmMagnetLicenseKeyEncrypted).not.toContain(
      plaintextKey
    );
    expect(updateArgs.data.dmMagnetLicenseKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(updateArgs.data.dmMagnetLicenseKeyPrefix).toContain("DMM-SOLO");
    expect(updateArgs.data.dmMagnetLicenseConfiguredAt).toBeInstanceOf(Date);
  });

  it("validates the License Key belonging to the requested workspace", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);

    const plaintextKey = "DMM-CREATOR-WORKSPACE-KEY";
    dbMocks.workspaceFindUnique.mockResolvedValue({
      dmMagnetLicenseKeyEncrypted: encryptSecret(plaintextKey),
      dmMagnetLicenseKeyPrefix: "DMM-CREATOR-…-KEY",
    });

    const fetchMock = vi.fn().mockResolvedValue(activeLicenseResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await validateDmMagnetWorkspaceLicense(
      "workspace_validate",
      { force: true }
    );

    expect(result).toMatchObject({
      valid: true,
      status: "ACTIVE",
    });
    expect(dbMocks.workspaceFindUnique).toHaveBeenCalledWith({
      where: { id: "workspace_validate" },
      select: {
        dmMagnetLicenseKeyEncrypted: true,
        dmMagnetLicenseKeyPrefix: true,
      },
    });
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(plaintextKey);
  });

  it("surfaces account-limit errors using the current workspace credential", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);

    dbMocks.workspaceFindUnique.mockResolvedValue({
      dmMagnetLicenseKeyEncrypted: encryptSecret("DMM-SOLO-LIMITED-KEY"),
      dmMagnetLicenseKeyPrefix: "DMM-SOLO-…-KEY",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "ACCOUNT_LIMIT_REACHED",
            message: "Social account limit reached for this license",
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
        workspaceId: "workspace_limit",
        instagramAccountId: "ig_second",
        instagramUsername: "second.account",
        instanceId: "shared-saas#workspace:workspace_limit",
      })
    ).rejects.toMatchObject({
      code: "ACCOUNT_LIMIT_REACHED",
      status: 409,
    });
  });

  it("fails closed when the shared SaaS has no License Key for a workspace", async () => {
    vi.stubEnv("DM_MAGNET_LICENSE_URL", "https://license.example.com");
    vi.stubEnv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);

    dbMocks.workspaceFindUnique.mockResolvedValue({
      dmMagnetLicenseKeyEncrypted: null,
      dmMagnetLicenseKeyPrefix: null,
    });

    await expect(
      validateDmMagnetWorkspaceLicense("workspace_missing", { force: true })
    ).rejects.toMatchObject({
      code: "LICENSE_NOT_CONFIGURED",
      status: 409,
    });
  });

  it("maps central and workspace license errors to safe Settings query codes", () => {
    expect(
      licenseErrorToSettingsCode(
        new DmMagnetLicenseError("revoked", "LICENSE_REVOKED", 403)
      )
    ).toBe("revoked");

    expect(
      licenseErrorToSettingsCode(
        new DmMagnetLicenseError(
          "missing",
          "LICENSE_NOT_CONFIGURED",
          409
        )
      )
    ).toBe("not_configured");

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
