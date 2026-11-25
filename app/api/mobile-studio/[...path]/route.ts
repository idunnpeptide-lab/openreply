import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceContext, hasWorkspaceRole } from "@/lib/workspace-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // Prototype limit: avoid loading huge videos into Next.js memory.

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return forward(request, context);
}

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const workspace = await getCurrentWorkspaceContext();
  if (!workspace) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasWorkspaceRole(workspace.role, "ADMIN")) {
    return NextResponse.json({ error: "Workspace admin permission required" }, { status: 403 });
  }

  const { path } = await context.params;
  const action = (path || []).join("/");
  const allowed =
    (request.method === "GET" && action === "device") ||
    (request.method === "POST" && action === "media") ||
    (request.method === "POST" && /^apps\/(instagram|tiktok|youtube)\/open$/.test(action));
  if (!allowed) return NextResponse.json({ error: "Unsupported Mobile Studio action" }, { status: 404 });

  const base = process.env.MOBILE_STUDIO_API_URL?.replace(/\/$/, "");
  const token = process.env.MOBILE_STUDIO_API_TOKEN;
  if (!base || !token || token.length < 32) {
    return NextResponse.json({
      error: "Mobile Studio host is not connected. Provision a private KVM Android host first.",
      configured: false,
    }, { status: 503 });
  }

  let origin: URL;
  try {
    origin = new URL(base);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash) {
      throw new Error("Secure HTTPS host is required");
    }
  } catch {
    return NextResponse.json({ error: "Invalid Mobile Studio host configuration" }, { status: 503 });
  }

  const headers = new Headers({ Authorization: "Bearer " + token, Accept: "application/json" });
  let body: FormData | undefined;
  if (action === "media") {
    const len = Number(request.headers.get("content-length") || 0);
    if (len > MAX_UPLOAD_BYTES + 65536) {
      return NextResponse.json({ error: "Maximum video size for this pilot is 50 MB" }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_UPLOAD_BYTES || file.size < 12) {
      return NextResponse.json({ error: "Choose a valid MP4 file under 50 MB" }, { status: 413 });
    }
    if (!file.name.toLowerCase().endsWith(".mp4")) {
      return NextResponse.json({ error: "MP4 is required" }, { status: 415 });
    }
    body = new FormData();
    body.append("file", file, file.name);
  }

  try {
    const result = await fetch(origin.origin + origin.pathname.replace(/\/$/, "") + "/v1/" + action, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(action === "media" ? 180000 : 20000),
    });
    const response = await result.text();
    let payload: unknown;
    try { payload = JSON.parse(response); } catch { payload = { error: "Device gateway response was invalid" }; }
    return NextResponse.json(payload, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Secure Mobile Studio gateway is unavailable" }, { status: 502 });
  }
}
