import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getInstagramConnectionHealth } from "@/lib/instagram/connection-health";
import { getCurrentWorkspaceId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
    select: {
      id: true,
      username: true,
      accessToken: true,
      tokenExpiresAt: true,
      webhookSubscribed: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  const data = accounts.map((account) => ({
    id: account.id,
    username: account.username,
    connectedAt: account.connectedAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
    ...getInstagramConnectionHealth(account),
  }));

  return NextResponse.json(
    {
      success: true,
      data,
      summary: {
        total: data.length,
        connected: data.filter((account) => account.connected).length,
        ready: data.filter((account) => account.overall === "READY").length,
        needsAttention: data.filter(
          (account) => account.overall === "NEEDS_ATTENTION"
        ).length,
        disconnected: data.filter(
          (account) => account.overall === "DISCONNECTED"
        ).length,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
