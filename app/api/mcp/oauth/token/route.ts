import { NextRequest, NextResponse } from "next/server";
import { consumeAuthorizationCode } from "@/lib/mcp/replay";
import { isMcpTokenRevoked } from "@/lib/mcp/revocation";
import {
  issueAccessToken,
  verifyAuthorizationCode,
  verifyClientId,
  verifyPkce,
  verifyRefreshToken,
} from "@/lib/mcp/auth";

function tokenResponse(accessToken: string, refreshToken: string | null, expiresIn: number, scopes: string[]) {
  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    ...(refreshToken ? { refresh_token: refreshToken } : {}),
    scope: scopes.join(" "),
  }, {
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const form = new URLSearchParams(raw);
  const grantType = form.get("grant_type");
  const clientId = form.get("client_id") || "";
  const requestedResource = form.get("resource");

  if (!verifyClientId(clientId)) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  if (grantType === "authorization_code") {
    const code = form.get("code") || "";
    const redirectUri = form.get("redirect_uri") || "";
    const verifier = form.get("code_verifier") || "";
    const claims = verifyAuthorizationCode(code);

    if (
      !claims ||
      claims.clientId !== clientId ||
      claims.redirectUri !== redirectUri ||
      (requestedResource && requestedResource !== claims.resource)
    ) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (!verifier || !verifyPkce(verifier, claims.codeChallenge)) {
      return NextResponse.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, { status: 400 });
    }

    const firstUse = await consumeAuthorizationCode(code);
    if (!firstUse) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Authorization code was already used" }, { status: 400 });
    }

    const issued = issueAccessToken({
      userId: claims.userId,
      workspaceId: claims.workspaceId,
      scopes: claims.scopes,
      clientId,
      resource: claims.resource,
    });
    return tokenResponse(issued.accessToken, issued.refreshToken, issued.expiresIn, claims.scopes);
  }

  if (grantType === "refresh_token") {
    const refresh = form.get("refresh_token") || "";
    const claims = verifyRefreshToken(refresh);
    if (!claims || claims.clientId !== clientId) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (await isMcpTokenRevoked({
      workspaceId: claims.workspaceId,
      userId: claims.userId,
      issuedAt: claims.iat,
    })) {
      return NextResponse.json({ error: "invalid_grant", error_description: "Connection was revoked" }, { status: 400 });
    }

    const issued = issueAccessToken({
      userId: claims.userId,
      workspaceId: claims.workspaceId,
      scopes: claims.scopes,
      clientId,
      resource: claims.resource,
    });
    return tokenResponse(issued.accessToken, issued.refreshToken, issued.expiresIn, claims.scopes);
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
