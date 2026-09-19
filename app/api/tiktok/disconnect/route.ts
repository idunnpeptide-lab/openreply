import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { encryptTikTokToken } from "@/lib/tiktok/oauth";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

const inputSchema = z.object({
  tiktokAccountId: z.string().min(1),
});

const DISCONNECTED_TOKEN_SENTINEL = "__REPLYHALO_TIKTOK_DISCONNECTED__";
const DISCONNECTED_AT_EPOCH = new Date(0);

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
      { success: false, error: "Only owners and admins can disconnect TikTok" },
      { status: 403 }
    );
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 }
    );
  }

  const account = await prisma.tikTokAccount.findFirst({
    where: {
      id: parsed.data.tiktokAccountId,
      workspaceId: context.workspaceId,
      refreshTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      username: true,
      openId: true,
    },
  });

  if (!account) {
    return NextResponse.json(
      { success: false, error: "Connected TikTok account not found" },
      { status: 404 }
    );
  }

  // Never delete the TikTokAccount row here. TikTok campaigns and durable
  // matches intentionally cascade from the account relation, so deletion would
  // erase staging/customer history. Reconnect OAuth upserts the same openId and
  // restores fresh encrypted tokens on this preserved row.
  await prisma.tikTokAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptTikTokToken(DISCONNECTED_TOKEN_SENTINEL),
      refreshTokenEncrypted: encryptTikTokToken(DISCONNECTED_TOKEN_SENTINEL),
      tokenExpiresAt: DISCONNECTED_AT_EPOCH,
      refreshTokenExpiresAt: DISCONNECTED_AT_EPOCH,
      grantedScopes: [],
      commentsEnabled: false,
      publicReplyEnabled: false,
      messagingEnabled: false,
      commentToMessageEnabled: false,
      webhookConfigured: false,
    },
  });

  await prisma.operationalEvent
    .create({
      data: {
        workspaceId: context.workspaceId,
        source: "SYSTEM",
        level: "INFO",
        message: "TikTok account disconnected safely",
        payload: {
          tiktokAccountId: account.id,
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
