import { NextResponse } from "next/server";
import { getCurrentWorkspaceContext, hasWorkspaceRole } from "@/lib/workspace-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const workspace = await getCurrentWorkspaceContext();
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasWorkspaceRole(workspace.role, "ADMIN")) {
    return NextResponse.json({ error: "Workspace admin permission required" }, { status: 403 });
  }
  // Never return secret keys, host credentials, account tokens or personal identifiers.
  return NextResponse.json({
    workspace_id: workspace.workspaceId,
    configured: Boolean(process.env.MOBILE_STUDIO_API_URL && process.env.MOBILE_STUDIO_API_TOKEN),
    physical_device: true,
    instructions: "Install Windows bridge, connect Android via USB debugging, configure an Access-protected Cloudflare Tunnel, then add the private host URL and credentials to the MCP staging Railway service.",
  }, { headers: { "Cache-Control": "no-store" } });
}
