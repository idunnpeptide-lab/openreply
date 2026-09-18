import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    service: "replyhalo",
    release: "safe-instagram-disconnect-v1",
  });
}
