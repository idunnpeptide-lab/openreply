import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { refreshExpiringInstagramTokens } from "@/lib/instagram/token-refresh";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usageReset = await prisma.workspace.updateMany({
    where: { usagePeriodStart: { lt: monthStart } },
    data: {
      usagePeriodStart: monthStart,
      dmsSentThisPeriod: 0,
    },
  });

  const tokenRefresh = await refreshExpiringInstagramTokens({ now });

  return NextResponse.json({
    success: true,
    data: {
      totalProcessed: tokenRefresh.totalProcessed,
      refreshed: tokenRefresh.refreshed,
      failed: tokenRefresh.failed,
      workspacesReset: usageReset.count,
      results: tokenRefresh.results,
    },
  });
}
