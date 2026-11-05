import { NextRequest, NextResponse } from "next/server";
import {
  TrendWatchNotConfiguredError,
  TrendWatchServiceError,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

const ALLOWED_ROOTS = new Set([
  "status",
  "niches",
  "accounts",
  "outliers",
  "trends",
  "saved",
  "sync",
  "analysis",
  "reels",
  "similar",
]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const workspace = await getCurrentWorkspaceContext();
  if (!workspace) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { path } = await context.params;
  const clean = (path ?? []).filter(Boolean);

  if (clean.length === 0 || !ALLOWED_ROOTS.has(clean[0])) {
    return NextResponse.json(
      { success: false, error: "Unknown Trend Watch route" },
      { status: 404 }
    );
  }

  const upstreamPath =
    "/v1/" +
    clean.map(encodeURIComponent).join("/") +
    request.nextUrl.search;

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const text = await request.text();
    body = text || undefined;
  }

  try {
    const data = await trendWatchRequest<unknown>(
      workspace.workspaceId,
      upstreamPath,
      {
        method: request.method,
        body,
        headers: body
          ? {
              "Content-Type":
                request.headers.get("content-type") || "application/json",
            }
          : undefined,
      }
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof TrendWatchNotConfiguredError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 }
      );
    }
    if (error instanceof TrendWatchServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Trend Watch request failed" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
