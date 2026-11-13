import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/env";
import { MCP_ALLOWED_SCOPES } from "@/lib/mcp/auth";

export async function GET() {
  const base = getBaseUrl().replace(/\/$/, "");
  return NextResponse.json({
    resource: base + "/mcp",
    authorization_servers: [base],
    scopes_supported: MCP_ALLOWED_SCOPES,
    bearer_methods_supported: ["header"],
  });
}
