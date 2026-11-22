import { NextRequest, NextResponse } from "next/server";
import { issueClientId } from "@/lib/mcp/auth";

function validRedirectUri(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    redirect_uris?: string[];
    client_name?: string;
  };

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((item) => typeof item === "string" && validRedirectUri(item))
    : [];

  if (redirectUris.length === 0) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const clientId = issueClientId({
    redirectUris,
    clientName: typeof body.client_name === "string" ? body.client_name.slice(0, 120) : undefined,
  });

  return NextResponse.json({
    client_id: clientId,
    client_name: body.client_name || "ReplyHalo MCP Client",
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  }, { status: 201 });
}
