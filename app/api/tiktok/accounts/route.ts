import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const accounts = await prisma.tikTokAccount.findMany({
    where: { workspaceId: context.workspaceId },
    select: {
      id: true,
      openId: true,
      username: true,
      displayName: true,
      tokenExpiresAt: true,
      refreshTokenExpiresAt: true,
      grantedScopes: true,
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
      commentToMessageEnabled: true,
      webhookConfigured: true,
      connectedAt: true,
      updatedAt: true,
      _count: {
        select: {
          automations: true,
          automationMatches: true,
        },
      },
    },
    orderBy: { connectedAt: "desc" },
  });

  return NextResponse.json(
    { success: true, data: accounts },
    { headers: { "Cache-Control": "no-store" } }
  );
}
