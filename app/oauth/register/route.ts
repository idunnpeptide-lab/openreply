import { NextRequest, NextResponse } from "next/server";
import { issueClientId } from "@/lib/mcp/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    redirect_uris?: unknown;
    client_name?: unknown;
    token_endpoint_auth_method?: unknown;
  };

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((item): item is string => typeof item === "string")
    : [];

  if (!redirectUris.length) {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  for (const value of redirectUris) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        throw new Error("invalid");
      }
    } catch {
      return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
    }
  }

  if (
    body.token_endpoint_auth_method &&
    body.token_endpoint_auth_method !== "none"
  ) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Only public PKCE clients are supported." },
      { status: 400 }
    );
  }

  const clientId = issueClientId({
    redirectUris,
    clientName: typeof body.client_name === "string" ? body.client_name.slice(0, 120) : undefined,
  });

  return NextResponse.json({
    client_id: clientId,
    client_name: typeof body.client_name === "string" ? body.client_name.slice(0, 120) : "MCP Client",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }, { status: 201 });
}
