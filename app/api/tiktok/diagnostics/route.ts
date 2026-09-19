import { NextRequest, NextResponse } from "next/server";
import { getTikTokExecutionDiagnostics } from "@/lib/tiktok/execution-diagnostics";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const parsedLimit = rawLimit === null ? undefined : Number(rawLimit);
  if (
    rawLimit !== null &&
    (!Number.isInteger(parsedLimit) || (parsedLimit as number) < 1)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid limit" },
      { status: 400 }
    );
  }

  const diagnostics = await getTikTokExecutionDiagnostics({
    workspaceId: context.workspaceId,
    limit: parsedLimit,
  });

  return NextResponse.json(
    { success: true, data: diagnostics },
    { headers: { "Cache-Control": "no-store" } }
  );
}
