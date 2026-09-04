import { createHash } from "crypto";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

export type DmMagnetLicenseSummary = {
  valid: true;
  id: string;
  status: "ACTIVE";
  plan: "SOLO" | "CREATOR" | "AGENCY";
  maxAccounts: number;
  usedAccounts: number;
  availableAccounts: number;
  expiresAt: string | null;
};

type DmMagnetBindResult = {
  bound: true;
  alreadyBound: boolean;
  usedAccounts: number;
  maxAccounts: number;
};

type DmMagnetApiErrorBody = {
  ok?: false;
  error?: string;
  message?: string;
};

type DmMagnetLicenseServerConfig = {
  baseUrl: string;
};

type WorkspaceLicenseCredential = {
  licenseKey: string;
  keyPrefix: string | null;
};

const VALIDATION_CACHE_MS = 60_000;

const validationCache = new Map<
  string,
  {
    expiresAt: number;
    value: DmMagnetLicenseSummary;
  }
>();

export class DmMagnetLicenseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "DmMagnetLicenseError";
  }
}

function normalizeBaseUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new DmMagnetLicenseError(
      "DM Magnet License Server URL is invalid",
      "LICENSE_SERVICE_MISCONFIGURED",
      500
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new DmMagnetLicenseError(
      "DM Magnet License Server URL must use HTTP or HTTPS",
      "LICENSE_SERVICE_MISCONFIGURED",
      500
    );
  }

  return parsed.toString().replace(/\/$/, "");
}

function hashLicenseKey(licenseKey: string) {
  return createHash("sha256").update(licenseKey).digest("hex");
}

function formatLicenseKeyPrefix(licenseKey: string) {
  const parts = licenseKey.split("-");
  const planPrefix =
    parts.length >= 2 ? `${parts[0]}-${parts[1]}` : licenseKey.slice(0, 8);
  const suffix = licenseKey.slice(-4);
  return `${planPrefix}-…${suffix}`;
}

export function getDmMagnetLicenseServerConfig(): DmMagnetLicenseServerConfig | null {
  const rawUrl = process.env.DM_MAGNET_LICENSE_URL?.trim();

  // A deployment without the central service URL keeps the original
  // self-hosted OpenReply behavior. Shared DM Magnet SaaS deployments set this
  // one non-secret URL globally; License Keys themselves live per workspace.
  if (!rawUrl) {
    return null;
  }

  return {
    baseUrl: normalizeBaseUrl(rawUrl),
  };
}

async function requestLicenseServer<T>(
  licenseKey: string,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const config = getDmMagnetLicenseServerConfig();

  if (!config) {
    throw new DmMagnetLicenseError(
      "DM Magnet License Server is not configured",
      "LICENSE_SERVICE_DISABLED",
      503
    );
  }

  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        licenseKey,
        ...body,
      }),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    throw new DmMagnetLicenseError(
      "Could not reach the DM Magnet License Server",
      "LICENSE_SERVICE_UNAVAILABLE",
      503
    );
  }

  const payload = (await response.json().catch(() => ({}))) as
    | T
    | DmMagnetApiErrorBody;

  if (!response.ok) {
    const errorPayload = payload as DmMagnetApiErrorBody;

    throw new DmMagnetLicenseError(
      errorPayload.message || "DM Magnet license request failed",
      errorPayload.error || "LICENSE_SERVICE_ERROR",
      response.status
    );
  }

  return payload as T;
}

async function validateLicenseKey(
  licenseKey: string
): Promise<DmMagnetLicenseSummary> {
  const payload = await requestLicenseServer<{
    ok: true;
    license: DmMagnetLicenseSummary;
  }>(licenseKey, "/api/licenses/validate", {});

  return payload.license;
}

async function getWorkspaceLicenseCredential(
  workspaceId: string
): Promise<WorkspaceLicenseCredential> {
  const workspaceLicense = await prisma.dmMagnetWorkspaceLicense.findUnique({
    where: { workspaceId },
    select: {
      licenseKeyEncrypted: true,
      licenseKeyPrefix: true,
    },
  });

  if (!workspaceLicense) {
    throw new DmMagnetLicenseError(
      "This workspace does not have a DM Magnet License Key",
      "LICENSE_NOT_CONFIGURED",
      409
    );
  }

  try {
    return {
      licenseKey: decryptSecret(workspaceLicense.licenseKeyEncrypted),
      keyPrefix: workspaceLicense.licenseKeyPrefix,
    };
  } catch {
    throw new DmMagnetLicenseError(
      "Workspace License Key could not be decrypted",
      "LICENSE_SECRET_INVALID",
      500
    );
  }
}

export async function getDmMagnetWorkspaceLicenseMetadata(
  workspaceId: string
) {
  const workspaceLicense = await prisma.dmMagnetWorkspaceLicense.findUnique({
    where: { workspaceId },
    select: {
      licenseKeyPrefix: true,
      configuredAt: true,
    },
  });

  return {
    configured: Boolean(workspaceLicense),
    keyPrefix: workspaceLicense?.licenseKeyPrefix ?? null,
    configuredAt: workspaceLicense?.configuredAt ?? null,
  };
}

export async function configureDmMagnetWorkspaceLicense(
  workspaceId: string,
  rawLicenseKey: string
): Promise<DmMagnetLicenseSummary> {
  const licenseKey = rawLicenseKey.trim();

  if (!licenseKey) {
    throw new DmMagnetLicenseError(
      "License Key is required",
      "LICENSE_KEY_REQUIRED",
      400
    );
  }

  if (!getDmMagnetLicenseServerConfig()) {
    throw new DmMagnetLicenseError(
      "DM Magnet License Server is not configured",
      "LICENSE_SERVICE_DISABLED",
      503
    );
  }

  const licenseKeyHash = hashLicenseKey(licenseKey);
  const existingCredential = await prisma.dmMagnetWorkspaceLicense.findUnique({
    where: { workspaceId },
    select: { licenseKeyHash: true },
  });

  // A workspace must establish its commercial license before social accounts
  // are connected. Changing the credential underneath already-connected
  // accounts would let those accounts keep sending without being bound to the
  // replacement license's central account slots.
  if (
    !existingCredential ||
    existingCredential.licenseKeyHash !== licenseKeyHash
  ) {
    const connectedAccounts = await prisma.instagramAccount.count({
      where: { workspaceId },
    });

    if (connectedAccounts > 0) {
      throw new DmMagnetLicenseError(
        "Remove or migrate connected social accounts before changing this workspace License Key",
        "LICENSE_ACCOUNT_MIGRATION_REQUIRED",
        409
      );
    }
  }

  // Validate before storing anything so invalid/revoked/expired keys never
  // become workspace credentials.
  const license = await validateLicenseKey(licenseKey);

  try {
    const encryptedKey = encryptSecret(licenseKey);
    const licenseKeyPrefix = formatLicenseKeyPrefix(licenseKey);

    await prisma.dmMagnetWorkspaceLicense.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        licenseKeyEncrypted: encryptedKey,
        licenseKeyHash,
        licenseKeyPrefix,
      },
      update: {
        licenseKeyEncrypted: encryptedKey,
        licenseKeyHash,
        licenseKeyPrefix,
        configuredAt: new Date(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DmMagnetLicenseError(
        "This License Key is already assigned to another workspace",
        "LICENSE_ALREADY_ASSIGNED",
        409
      );
    }
    throw error;
  }

  validationCache.set(workspaceId, {
    expiresAt: Date.now() + VALIDATION_CACHE_MS,
    value: license,
  });

  return license;
}

export async function validateDmMagnetWorkspaceLicense(
  workspaceId: string,
  options?: { force?: boolean }
): Promise<DmMagnetLicenseSummary | null> {
  if (!getDmMagnetLicenseServerConfig()) {
    return null;
  }

  const cached = validationCache.get(workspaceId);
  if (!options?.force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const credential = await getWorkspaceLicenseCredential(workspaceId);
  const license = await validateLicenseKey(credential.licenseKey);

  validationCache.set(workspaceId, {
    expiresAt: Date.now() + VALIDATION_CACHE_MS,
    value: license,
  });

  return license;
}

export async function bindDmMagnetInstagramAccount(input: {
  workspaceId: string;
  instagramAccountId: string;
  instagramUsername?: string | null;
  instanceId?: string | null;
}): Promise<DmMagnetBindResult | null> {
  if (!getDmMagnetLicenseServerConfig()) {
    return null;
  }

  const credential = await getWorkspaceLicenseCredential(input.workspaceId);
  const payload = await requestLicenseServer<{
    ok: true;
    bound: true;
    alreadyBound: boolean;
    usedAccounts: number;
    maxAccounts: number;
  }>(credential.licenseKey, "/api/licenses/bind-account", {
    platform: "INSTAGRAM",
    accountId: input.instagramAccountId,
    username: input.instagramUsername,
    instanceId: input.instanceId,
  });

  // Binding changes account usage, so the cached license summary is stale.
  validationCache.delete(input.workspaceId);

  return {
    bound: payload.bound,
    alreadyBound: payload.alreadyBound,
    usedAccounts: payload.usedAccounts,
    maxAccounts: payload.maxAccounts,
  };
}

export function licenseErrorToSettingsCode(error: unknown) {
  if (!(error instanceof DmMagnetLicenseError)) {
    return "failed";
  }

  switch (error.code) {
    case "LICENSE_NOT_FOUND":
      return "not_found";
    case "LICENSE_NOT_CONFIGURED":
      return "not_configured";
    case "LICENSE_ALREADY_ASSIGNED":
      return "already_assigned";
    case "LICENSE_ACCOUNT_MIGRATION_REQUIRED":
      return "account_migration_required";
    case "LICENSE_SUSPENDED":
      return "suspended";
    case "LICENSE_REVOKED":
      return "revoked";
    case "LICENSE_EXPIRED":
      return "expired";
    case "ACCOUNT_LIMIT_REACHED":
      return "account_limit";
    case "LICENSE_SERVICE_DISABLED":
    case "LICENSE_SERVICE_MISCONFIGURED":
      return "misconfigured";
    case "LICENSE_SERVICE_UNAVAILABLE":
      return "unavailable";
    default:
      return "failed";
  }
}
