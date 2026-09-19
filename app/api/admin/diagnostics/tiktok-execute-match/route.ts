import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getBaseUrl } from "@/lib/env";
import { executeTikTokAutomationMatch } from "@/lib/tiktok/action-executor";
import {
  TIKTOK_CONTROLLED_STAGING_SEND_ENABLED,
  TIKTOK_LIVE_EXECUTION_ENABLED,
} from "@/lib/tiktok/staging-readiness";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONFIRMATION = "EXECUTE_TIKTOK_STAGING_MATCH";

const inputSchema = z.object({
  matchId: z.string().min(1),
  confirmation: z.literal(CONFIRMATION),
});

function isStagingDeployment() {
  try {
    return new URL(getBaseUrl()).hostname.toLowerCase().includes("staging");
  } catch {
    return false;
  }
}

function publicResult(result: Awaited<ReturnType<typeof executeTikTokAutomationMatch>>) {
  if (result.state === "EXECUTED") {
    return {
      state: result.state,
      matchId: result.matchId,
      providerActionId: result.providerActionId,
    };
  }
  if (result.state === "FAILED") {
    return {
      state: result.state,
      matchId: result.matchId,
      code: result.code,
    };
  }
  if (result.state === "SKIPPED") {
    return {
      state: result.state,
      matchId: result.matchId,
      reason: result.reason,
    };
  }
  if (result.state === "TERMINAL") {
    return {
      state: result.state,
      matchId: result.matchId,
      status: result.status,
    };
  }
  return { state: result.state, matchId: result.matchId };
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 }
    );
  }

  // This endpoint is a deliberately narrow staging QA surface. It must never
  // become a production customer execution API.
  if (!isStagingDeployment()) {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 }
    );
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid confirmation" },
      { status: 400 }
    );
  }

  // Scope the durable match before consulting any execution gate so callers
  // cannot use this endpoint to probe another workspace's match identifiers.
  const match = await prisma.tikTokAutomationMatch.findFirst({
    where: {
      id: parsed.data.matchId,
      workspaceId: context.workspaceId,
    },
    select: {
      id: true,
      status: true,
      eventType: true,
      tiktokAccount: {
        select: {
          refreshTokenExpiresAt: true,
          webhookConfigured: true,
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json(
      { success: false, error: "TikTok match not found" },
      { status: 404 }
    );
  }

  if (match.status !== "MATCHED") {
    return NextResponse.json(
      {
        success: false,
        error: "TikTok match is already terminal",
        state: "TERMINAL",
        matchId: match.id,
        status: match.status,
      },
      { status: 409 }
    );
  }

  if (match.tiktokAccount.refreshTokenExpiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      {
        success: false,
        error: "TikTok account must be connected before controlled execution",
        state: "BLOCKED",
        matchId: match.id,
        reason: "ACCOUNT_DISCONNECTED",
      },
      { status: 409 }
    );
  }

  if (!match.tiktokAccount.webhookConfigured) {
    return NextResponse.json(
      {
        success: false,
        error:
          "A real supported signed TikTok webhook must confirm runtime readiness before controlled execution",
        state: "BLOCKED",
        matchId: match.id,
        reason: "WEBHOOK_DELIVERY_NOT_CONFIRMED",
      },
      { status: 409 }
    );
  }

  // Two source-controlled locks must be explicitly changed in reviewed code
  // before this route can call the provider executor. Neither can be toggled by
  // the browser, request body, deployment environment, or database state.
  if (
    !TIKTOK_LIVE_EXECUTION_ENABLED ||
    !TIKTOK_CONTROLLED_STAGING_SEND_ENABLED
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Controlled TikTok staging execution is locked",
        state: "LOCKED",
        matchId: match.id,
        gates: {
          liveExecutionEnabled: TIKTOK_LIVE_EXECUTION_ENABLED,
          controlledStagingSendEnabled:
            TIKTOK_CONTROLLED_STAGING_SEND_ENABLED,
        },
      },
      { status: 423, headers: { "Cache-Control": "no-store" } }
    );
  }

  const result = await executeTikTokAutomationMatch(match.id);
  const sanitized = publicResult(result);

  return NextResponse.json(
    {
      success: result.state === "EXECUTED",
      data: sanitized,
      ...(result.state !== "EXECUTED"
        ? { error: "TikTok controlled execution did not execute" }
        : {}),
    },
    {
      status:
        result.state === "EXECUTED"
          ? 200
          : result.state === "FAILED"
            ? 502
            : 409,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
