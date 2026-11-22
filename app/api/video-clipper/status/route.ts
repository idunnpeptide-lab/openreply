import { NextResponse } from "next/server";
import { checkSupoClipConnection, getVideoClipperConfigStatus } from "@/lib/video-clipper/supoclip";
import { requireVideoClipperContext } from "@/lib/video-clipper/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireVideoClipperContext();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = getVideoClipperConfigStatus();
  if (!config.configured) {
    return NextResponse.json({ configured: false, connected: false, apiUrl: config.apiUrl });
  }

  const health = await checkSupoClipConnection();
  return NextResponse.json({
    configured: true,
    connected: health.ok,
    apiUrl: config.apiUrl,
    latencyMs: health.latencyMs,
    error: health.ok ? null : health.error,
  });
}
