import { createHash, createHmac, timingSafeEqual } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { requireEnv } from "@/lib/env";

export const MCP_ALLOWED_SCOPES = [
  "mcp:trendwatch:read",
  "mcp:instagram:read",
  "mcp:campaigns:read",
  "mcp:inbox:read",
] as const;

export type McpScope = (typeof MCP_ALLOWED_SCOPES)[number];

type SignedEnvelope = {
  typ: "client" | "code" | "access" | "refresh";
  iat: number;
  exp: number;
  [key: string]: unknown;
};

export type McpAccessClaims = SignedEnvelope & {
  typ: "access";
  userId: string;
  workspaceId: string;
  scopes: McpScope[];
  clientId: string;
};

type ClientClaims = SignedEnvelope & {
  typ: "client";
  redirectUris: string[];
  clientName?: string;
};

type CodeClaims = SignedEnvelope & {
  typ: "code";
  userId: string;
  workspaceId: string;
  scopes: McpScope[];
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
};

type RefreshClaims = SignedEnvelope & {
  typ: "refresh";
  userId: string;
  workspaceId: string;
  scopes: McpScope[];
  clientId: string;
};

function secret() {
  return requireEnv("NEXTAUTH_SECRET");
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function pack(payload: SignedEnvelope) {
  const body = encode(payload);
  return `${body}.${sign(body)}`;
}

function unpack<T extends SignedEnvelope>(value: string, expectedType: T["typ"]): T | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    if (payload.typ !== expectedType) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function now() {
  return Math.floor(Date.now() / 1000);
}

export function normalizeRequestedScopes(raw: string | null | undefined): McpScope[] {
  const requested = (raw || "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (requested.length === 0) return [...MCP_ALLOWED_SCOPES];
  return MCP_ALLOWED_SCOPES.filter((scope) => requested.includes(scope));
}

export function issueClientId(input: { redirectUris: string[]; clientName?: string }) {
  const ts = now();
  return pack({
    typ: "client",
    iat: ts,
    exp: ts + 365 * 24 * 60 * 60,
    redirectUris: input.redirectUris,
    clientName: input.clientName,
  });
}

export function verifyClientId(clientId: string): ClientClaims | null {
  return unpack<ClientClaims>(clientId, "client");
}

export async function getCurrentOAuthWorkspace() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true, userId: true },
  });
  return membership;
}

export function issueAuthorizationCode(input: {
  userId: string;
  workspaceId: string;
  scopes: McpScope[];
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}) {
  const ts = now();
  return pack({
    typ: "code",
    iat: ts,
    exp: ts + 5 * 60,
    ...input,
  });
}

export function verifyAuthorizationCode(code: string): CodeClaims | null {
  return unpack<CodeClaims>(code, "code");
}

export function verifyPkce(verifier: string, challenge: string) {
  const digest = createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(digest);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueAccessToken(input: {
  userId: string;
  workspaceId: string;
  scopes: McpScope[];
  clientId: string;
}) {
  const ts = now();
  const accessToken = pack({
    typ: "access",
    iat: ts,
    exp: ts + 60 * 60,
    ...input,
  });
  const refreshToken = pack({
    typ: "refresh",
    iat: ts,
    exp: ts + 30 * 24 * 60 * 60,
    ...input,
  });
  return { accessToken, refreshToken, expiresIn: 3600 };
}

export function verifyAccessToken(token: string): McpAccessClaims | null {
  return unpack<McpAccessClaims>(token, "access");
}

export function verifyRefreshToken(token: string): RefreshClaims | null {
  return unpack<RefreshClaims>(token, "refresh");
}

export function hasScope(claims: McpAccessClaims, scope: McpScope) {
  return claims.scopes.includes(scope);
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
