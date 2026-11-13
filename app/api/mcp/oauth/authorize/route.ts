import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import {
  getCurrentOAuthWorkspace,
  issueAuthorizationCode,
  normalizeRequestedScopes,
  verifyClientId,
} from "@/lib/mcp/auth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const responseType = params.get("response_type");
  const codeChallenge = params.get("code_challenge") || "";
  const codeChallengeMethod = params.get("code_challenge_method");
  const state = params.get("state");
  const scopes = normalizeRequestedScopes(params.get("scope"));

  const client = verifyClientId(clientId);
  if (!client || responseType !== "code" || codeChallengeMethod !== "S256") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }
  if (!codeChallenge) {
    return NextResponse.json({ error: "invalid_request", error_description: "PKCE code_challenge is required" }, { status: 400 });
  }

  const membership = await getCurrentOAuthWorkspace();
  if (!membership) {
    const base = getBaseUrl().replace(/\/$/, "");
    const callbackUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(base + "/login?callbackUrl=" + callbackUrl);
  }

  const code = issueAuthorizationCode({
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    scopes,
    clientId,
    redirectUri,
    codeChallenge,
  });

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect);
}
