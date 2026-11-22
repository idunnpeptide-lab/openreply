import { NextResponse } from "next/server";
import { getCurrentOAuthWorkspace } from "@/lib/mcp/auth";
import { revokeAllMcpTokens } from "@/lib/mcp/revocation";
import { prisma } from "@/lib/db/client";

export async function POST() {
  const membership = await getCurrentOAuthWorkspace();
  if (!membership) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const revokedBefore = await revokeAllMcpTokens(
    membership.workspaceId,
    membership.userId
  );

  await prisma.operationalEvent.create({
    data: {
      source: "SYSTEM",
      level: "INFO",
      workspaceId: membership.workspaceId,
      message: "MCP connections revoked",
      payload: {
        userId: membership.userId,
        revokedBefore,
      },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, revokedBefore });
}
