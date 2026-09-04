type DmMagnetLicenseSummary = {
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

type DmMagnetLicenseConfig = {
  baseUrl: string;
  licenseKey: string;
};

const VALIDATION_CACHE_MS = 60_000;

let cachedValidation:
  | {
      key: string;
      expiresAt: number;
      value: DmMagnetLicenseSummary;
    }
  | undefined;

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

export function getDmMagnetLicenseConfig(): DmMagnetLicenseConfig | null {
  const rawUrl = process.env.DM_MAGNET_LICENSE_URL?.trim();
  const licenseKey = process.env.DM_MAGNET_LICENSE_KEY?.trim();

  // Backwards-compatible while the commercial license layer is being rolled
  // out. When neither variable is present, the OpenReply fork behaves exactly
  // as it did before the DM Magnet integration.
  if (!rawUrl && !licenseKey) {
    return null;
  }

  if (!rawUrl || !licenseKey) {
    throw new DmMagnetLicenseError(
      "Both DM_MAGNET_LICENSE_URL and DM_MAGNET_LICENSE_KEY are required",
      "LICENSE_SERVICE_MISCONFIGURED",
      500
    );
  }

  return {
    baseUrl: normalizeBaseUrl(rawUrl),
    licenseKey,
  };
}

async function requestLicenseServer<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const config = getDmMagnetLicenseConfig();

  if (!config) {
    throw new DmMagnetLicenseError(
      "DM Magnet licensing is not configured",
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
        licenseKey: config.licenseKey,
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

export async function validateDmMagnetLicense(options?: {
  force?: boolean;
}): Promise<DmMagnetLicenseSummary | null> {
  const config = getDmMagnetLicenseConfig();
  if (!config) return null;

  const cacheKey = `${config.baseUrl}|${config.licenseKey}`;

  if (
    !options?.force &&
    cachedValidation?.key === cacheKey &&
    cachedValidation.expiresAt > Date.now()
  ) {
    return cachedValidation.value;
  }

  const payload = await requestLicenseServer<{
    ok: true;
    license: DmMagnetLicenseSummary;
  }>("/api/licenses/validate", {});

  cachedValidation = {
    key: cacheKey,
    expiresAt: Date.now() + VALIDATION_CACHE_MS,
    value: payload.license,
  };

  return payload.license;
}

export async function bindDmMagnetInstagramAccount(input: {
  instagramAccountId: string;
  instagramUsername?: string | null;
  instanceId?: string | null;
}): Promise<DmMagnetBindResult | null> {
  const config = getDmMagnetLicenseConfig();
  if (!config) return null;

  const payload = await requestLicenseServer<{
    ok: true;
    bound: true;
    alreadyBound: boolean;
    usedAccounts: number;
    maxAccounts: number;
  }>("/api/licenses/bind-account", {
    platform: "INSTAGRAM",
    accountId: input.instagramAccountId,
    username: input.instagramUsername,
    instanceId: input.instanceId,
  });

  // Binding changes account usage, so the cached license summary is stale.
  cachedValidation = undefined;

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
    case "LICENSE_SUSPENDED":
      return "suspended";
    case "LICENSE_REVOKED":
      return "revoked";
    case "LICENSE_EXPIRED":
      return "expired";
    case "ACCOUNT_LIMIT_REACHED":
      return "account_limit";
    case "LICENSE_SERVICE_MISCONFIGURED":
      return "misconfigured";
    case "LICENSE_SERVICE_UNAVAILABLE":
      return "unavailable";
    default:
      return "failed";
  }
}
