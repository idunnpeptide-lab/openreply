import { createHmac, timingSafeEqual } from "crypto";
import { requireEnv } from "@/lib/env";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import {
  buildTikTokBusinessAuthorizationUrl,
  getTikTokBusinessConfig,
  TIKTOK_BUSINESS_API_BASE_URL,
  TIKTOK_BUSINESS_API_VERSION,
  TIKTOK_REFRESH_TOKEN_ENDPOINT,
  TIKTOK_SHORT_TERM_TOKEN_ENDPOINT,
} from "@/lib/tiktok/config";

const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const PROFILE_FIELDS = ["display_name", "username", "profile_image"] as const;

interface TikTokOAuthStatePayload {
  workspaceId: string;
  provider: "TIKTOK";
  ts: number;
}

type TikTokApiEnvelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

export type TikTokTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresIn: number;
  openId: string;
  scopes: string[];
  tokenType: string;
};

export type TikTokBusinessProfile = {
  openId: string;
  username: string | null;
  displayName: string | null;
  profileImage: string | null;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signState(payload: string): string {
  return createHmac("sha256", requireEnv("NEXTAUTH_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function createTikTokOAuthState(workspaceId: string): string {
  const payload = base64UrlEncode(
    JSON.stringify({
      workspaceId,
      provider: "TIKTOK",
      ts: Date.now(),
    } satisfies TikTokOAuthStatePayload)
  );

  return `${payload}.${signState(payload)}`;
}

export function verifyTikTokOAuthState(
  state: string | null
): TikTokOAuthStatePayload | null {
  if (!state) return null;

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = signState(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      base64UrlDecode(payload)
    ) as TikTokOAuthStatePayload;

    if (
      !parsed.workspaceId ||
      parsed.provider !== "TIKTOK" ||
      !Number.isFinite(parsed.ts) ||
      Date.now() - parsed.ts > STATE_MAX_AGE_MS
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getTikTokAuthorizationUrl(state: string): string {
  const config = getTikTokBusinessConfig();
  if (!config) {
    throw new Error("TikTok Business API is not configured");
  }

  return buildTikTokBusinessAuthorizationUrl({
    appId: config.appId,
    redirectUri: config.redirectUri,
    state,
    scopes: config.scopes,
  });
}

function parseScopes(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return [...new Set(scope.split(",").map((value) => value.trim()).filter(Boolean))];
}

export function parseTikTokScopes(scope: string | null | undefined) {
  return parseScopes(scope);
}

async function postTokenRequest(
  endpoint: string,
  body: Record<string, string>
): Promise<TikTokTokenSet> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokApiEnvelope<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        refresh_token_expires_in: number;
        open_id: string;
        scope?: string;
        token_type?: string;
      }>
    | null;

  if (!response.ok || !payload || payload.code !== 0 || !payload.data) {
    throw new Error(
      `TikTok token request failed: ${payload?.message ?? response.statusText}`
    );
  }

  const data = payload.data;
  if (
    !data.access_token ||
    !data.refresh_token ||
    !data.open_id ||
    !Number.isFinite(data.expires_in) ||
    !Number.isFinite(data.refresh_token_expires_in)
  ) {
    throw new Error("TikTok token response is incomplete");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshTokenExpiresIn: data.refresh_token_expires_in,
    openId: data.open_id,
    scopes: parseScopes(data.scope),
    tokenType: data.token_type ?? "Bearer",
  };
}

export async function exchangeTikTokAuthCode(
  authCode: string
): Promise<TikTokTokenSet> {
  const config = getTikTokBusinessConfig();
  if (!config) {
    throw new Error("TikTok Business API is not configured");
  }

  return postTokenRequest(TIKTOK_SHORT_TERM_TOKEN_ENDPOINT, {
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "authorization_code",
    auth_code: authCode,
    redirect_uri: config.redirectUri,
  });
}

export async function refreshTikTokAccessToken(
  refreshToken: string
): Promise<TikTokTokenSet> {
  const config = getTikTokBusinessConfig();
  if (!config) {
    throw new Error("TikTok Business API is not configured");
  }

  return postTokenRequest(TIKTOK_REFRESH_TOKEN_ENDPOINT, {
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export async function getTikTokBusinessProfile(input: {
  accessToken: string;
  openId: string;
}): Promise<TikTokBusinessProfile> {
  const url = new URL(
    `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}/business/get/`
  );
  url.searchParams.set("business_id", input.openId);
  url.searchParams.set("fields", JSON.stringify(PROFILE_FIELDS));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Access-Token": input.accessToken,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokApiEnvelope<{
        business_id?: string;
        username?: string;
        display_name?: string;
        profile_image?: string;
      }>
    | null;

  if (!response.ok || !payload || payload.code !== 0 || !payload.data) {
    throw new Error(
      `TikTok profile request failed: ${payload?.message ?? response.statusText}`
    );
  }

  return {
    openId: payload.data.business_id ?? input.openId,
    username: payload.data.username ?? null,
    displayName: payload.data.display_name ?? null,
    profileImage: payload.data.profile_image ?? null,
  };
}

export function encryptTikTokToken(value: string): string {
  return encryptSecret(value);
}

export function decryptTikTokToken(value: string): string {
  return decryptSecret(value);
}
