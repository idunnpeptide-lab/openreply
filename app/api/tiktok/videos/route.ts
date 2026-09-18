import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { listTikTokVideos, TikTokApiError } from "@/lib/tiktok/client";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  tiktokAccountId: z.string().min(1),
  cursor: z.coerce.number().int().min(0).optional(),
  maxCount: z.coerce.number().int().min(1).max(20).optional(),
});

export async function GET(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const parsed = querySchema.safeParse({
    tiktokAccountId: request.nextUrl.searchParams.get("tiktokAccountId") ?? "",
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
    maxCount: request.nextUrl.searchParams.get("maxCount") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const account = await prisma.tikTokAccount.findFirst({
    where: {
      id: parsed.data.tiktokAccountId,
      workspaceId: context.workspaceId,
    },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json(
      { success: false, error: "TikTok account not found" },
      { status: 404 }
    );
  }

  try {
    const page = await listTikTokVideos({
      tiktokAccountId: account.id,
      cursor: parsed.data.cursor,
      maxCount: parsed.data.maxCount,
    });

    return NextResponse.json(
      { success: true, data: page },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof TikTokApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      );
    }
    throw error;
  }
}
