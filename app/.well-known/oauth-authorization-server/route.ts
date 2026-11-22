import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import { MCP_ALLOWED_SCOPES } from "@/lib/mcp/auth";

export async function GET() {
  const base = getBaseUrl().replace(/\/$/, "");
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: base + "/api/mcp/oauth/authorize",
    token_endpoint: base + "/api/mcp/oauth/token",
    registration_endpoint: base + "/api/mcp/oauth/register",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: MCP_ALLOWED_SCOPES,
  });
}
