import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import Redis from "ioredis";
import { getBaseUrl, requireEnv } from "@/lib/env";

export const MCP_SCOPES = [
  "mcp:trendwatch:read",
  "mcp:instagram:read",
  "mcp:campaigns:read",
  "mcp:inbox:read",
] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

type SignedPayload = {
  typ: "client" | "code" | "access" | "refresh";
  iat: number;
  exp: number;
  jti: string;
  clientId?: string;
  redirectUris?: string[];
  redirectUri?: string;
  codeChallenge?: string;
  userId?: string;
  workspaceId?: string;
  scopes?: string[];
  aud?: string;
};

let redis: Redis | null = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(requireEnv("REDIS_URL"), {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });
  }
  return redis;
}

function b64(value: string) {
  return Buffer.from(value).toString("base64url");
}

function unb64(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function secret() {
  return requireEnv("NEXTAUTH_SECRET");
}

function signRaw(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function issue(payload: Omit<SignedPayload, "iat" | "jti">) {
  const full: SignedPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: randomBytes(18).toString("base64url"),
  };
  const encoded = b64(JSON.stringify(full));
  return encoded + "." + signRaw(encoded);
}

function verify(token: string, typ: SignedPayload["typ"]) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) throw new Error("invalid_token");
  const expected = signRaw(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("invalid_token");
  }
  const payload = JSON.parse(unb64(encoded)) as SignedPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.typ !== typ || payload.exp <= now) throw new Error("invalid_token");
  return payload;
}

export function getMcpIssuer() {
  return getBaseUrl().replace(/\/$/, "");
}

export function normalizeScopes(raw: string | null | undefined): McpScope[] {
  const requested = (raw || MCP_SCOPES.join(" "))
    .split(/\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const allowed = new Set<string>(MCP_SCOPES);
  const scopes = requested.filter((scope): scope is McpScope => allowed.has(scope));
  return scopes.length ? scopes : [...MCP_SCOPES];
}

export function registerPublicClient(redirectUris: string[]) {
  const sanitized = redirectUris.filter((uri) => {
    try {
      const url = new URL(uri);
      return url.protocol === "https:" || url.hostname === "localhost";
    } catch {
      return false;
    }
  });
  if (!sanitized.length) throw new Error("invalid_redirect_uri");
  return issue({
    typ: "client",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    redirectUris: sanitized,
  });
}

export function verifyClient(clientId: string, redirectUri: string) {
  const payload = verify(clientId, "client");
  if (!payload.redirectUris?.includes(redirectUri)) throw new Error("invalid_redirect_uri");
  return payload;
}

export function issueAuthorizationCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  userId: string;
  workspaceId: string;
  scopes: string[];
}) {
  return issue({
    typ: "code",
    exp: Math.floor(Date.now() / 1000) + 120,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    userId: input.userId,
    workspaceId: input.workspaceId,
    scopes: input.scopes,
  });
}

function pkceS256(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const payload = verify(input.code, "code");
  if (
    payload.clientId !== input.clientId ||
    payload.redirectUri !== input.redirectUri ||
    !payload.codeChallenge ||
    pkceS256(input.codeVerifier) !== payload.codeChallenge ||
    !payload.userId ||
    !payload.workspaceId
  ) {
    throw new Error("invalid_grant");
  }

  const key = "mcp:oauth:code:" + payload.jti;
  const client = getRedis();
  if (client.status === "wait") await client.connect();
  const consumed = await client.set(key, "1", "EX", 180, "NX");
  if (consumed !== "OK") throw new Error("invalid_grant");

  const scopes = payload.scopes ?? [];
  return {
    accessToken: issue({
      typ: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
      clientId: input.clientId,
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      scopes,
      aud: getMcpIssuer() + "/mcp",
    }),
    refreshToken: issue({
      typ: "refresh",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      clientId: input.clientId,
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      scopes,
      aud: getMcpIssuer() + "/mcp",
    }),
    scopes,
  };
}

export function exchangeRefreshToken(input: {
  refreshToken: string;
  clientId: string;
}) {
  const payload = verify(input.refreshToken, "refresh");
  if (
    payload.clientId !== input.clientId ||
    !payload.userId ||
    !payload.workspaceId
  ) {
    throw new Error("invalid_grant");
  }
  const scopes = payload.scopes ?? [];
  return {
    accessToken: issue({
      typ: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
      clientId: input.clientId,
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      scopes,
      aud: getMcpIssuer() + "/mcp",
    }),
    refreshToken: issue({
      typ: "refresh",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      clientId: input.clientId,
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      scopes,
      aud: getMcpIssuer() + "/mcp",
    }),
    scopes,
  };
}

export function verifyAccessToken(token: string) {
  const payload = verify(token, "access");
  if (
    payload.aud !== getMcpIssuer() + "/mcp" ||
    !payload.userId ||
    !payload.workspaceId
  ) {
    throw new Error("invalid_token");
  }
  return {
    userId: payload.userId,
    workspaceId: payload.workspaceId,
    scopes: payload.scopes ?? [],
    clientId: payload.clientId ?? "",
  };
}
