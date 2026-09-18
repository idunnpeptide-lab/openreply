import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can disconnect accounts" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const instagramAccountId =
    typeof body.instagramAccountId === "string" ? body.instagramAccountId : null;

  if (!instagramAccountId) {
    return NextResponse.json(
      { success: false, error: "Instagram account is required" },
      { status: 400 }
    );
  }

  const account = await prisma.instagramAccount.findFirst({
    where: {
      id: instagramAccountId,
      workspaceId: context.workspaceId,
    },
    select: {
      id: true,
      username: true,
    },
  });

  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not found" },
      { status: 404 }
    );
  }

  // Soft-disconnect instead of deleting the InstagramAccount row. Automations,
  // DM logs, tracked-link analytics, and follower history all reference this
  // row with cascading foreign keys, so deleting it would erase customer data.
  // Keeping the row also lets OAuth reconnect the same Instagram account via
  // the callback upsert without rebuilding campaigns or analytics history.
  await prisma.instagramAccount.update({
    where: { id: account.id },
    data: {
      accessToken: "",
      tokenExpiresAt: null,
      webhookSubscribed: false,
    },
  });

  await prisma.operationalEvent
    .create({
      data: {
        workspaceId: context.workspaceId,
        source: "SYSTEM",
        level: "INFO",
        message: `Instagram account @${account.username} disconnected`,
        payload: {
          instagramAccountId: account.id,
          preservedCampaignsAndHistory: true,
        },
      },
    })
    .catch(() => {});

  return NextResponse.json({
    success: true,
    data: { preservedCampaignsAndHistory: true },
  });
}
