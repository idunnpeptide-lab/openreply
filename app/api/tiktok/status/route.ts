import { NextResponse } from "next/server";
import { getMissingTikTokOAuthEnv } from "@/lib/env";
import { TIKTOK_LIVE_EXECUTION_ENABLED } from "@/lib/tiktok/staging-readiness";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const oauthConfigured = getMissingTikTokOAuthEnv().length === 0;

  return NextResponse.json(
    {
      success: true,
      data: {
        provider: "TIKTOK",
        phase: "STAGING_FOUNDATION",
        oauthConfigured,
        canManage: canManageWorkspace(context.role),
        liveExecutionEnabled: TIKTOK_LIVE_EXECUTION_ENABLED,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
