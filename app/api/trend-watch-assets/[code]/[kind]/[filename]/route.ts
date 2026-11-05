import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ code: string; kind: string; filename: string }>;
  }
) {
  const workspace = await getCurrentWorkspaceContext();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.TRENDWATCH_API_URL?.replace(/\/$/, "");
  const token = process.env.TRENDWATCH_INTERNAL_TOKEN;
  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Trend Watch backend is not configured" }, { status: 503 });
  }

  const { code, kind, filename } = await context.params;
  const upstream =
    baseUrl +
    "/v1/analysis/" +
    encodeURIComponent(code) +
    "/asset/" +
    encodeURIComponent(kind) +
    "/" +
    encodeURIComponent(filename);

  const response = await fetch(upstream, {
    headers: {
      Authorization: "Bearer " + token,
      "X-ReplyHalo-Workspace-Id": workspace.workspaceId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Analysis asset unavailable" },
      { status: response.status }
    );
  }

  const bytes = await response.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
