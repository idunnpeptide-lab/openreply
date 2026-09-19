import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { getBaseUrl, getMissingTikTokOAuthEnv } from "@/lib/env";
import {
  listTikTokWebhookConfig,
  TikTokWebhookError,
  type TikTokWebhookEventType,
  updateTikTokWebhook,
} from "@/lib/tiktok/webhook";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANAGED_EVENT_TYPES = ["COMMENT", "DIRECT_MESSAGE"] as const;
type ManagedEventType = (typeof MANAGED_EVENT_TYPES)[number];

const postSchema = z.object({
  eventTypes: z
    .array(z.enum(MANAGED_EVENT_TYPES))
    .min(1)
    .max(MANAGED_EVENT_TYPES.length)
    .optional(),
});

type WebhookStatus = {
  eventType: ManagedEventType;
  providerReachable: boolean;
  configured: boolean;
  callbackMatchesExpected: boolean;
  callbackUrl: string | null;
  errorCode: string | null;
};

function isStagingDeployment() {
  try {
    return new URL(getBaseUrl()).hostname.toLowerCase().includes("staging");
  } catch {
    return false;
  }
}

function expectedWebhookUrl() {
  const baseUrl = new URL(getBaseUrl());
  return new URL("/api/tiktok/webhook", baseUrl.origin).toString();
}

function findCallbackUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCallbackUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  for (const key of ["callback_url", "callbackUrl"]) {
    const candidate = record[key];
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const url = new URL(candidate.trim());
      if (url.protocol === "https:") return url.toString();
    } catch {
      // Provider readback can evolve. Ignore malformed/unexpected fields rather
      // than echoing arbitrary provider payload data to the browser.
    }
  }

  for (const nested of Object.values(record)) {
    const found = findCallbackUrl(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

function providerErrorCode(error: unknown) {
  if (error instanceof TikTokWebhookError) return error.code;
  return "TIKTOK_WEBHOOK_CONFIG_FAILED";
}

async function readEventStatus(
  eventType: ManagedEventType,
  expectedUrl: string
): Promise<WebhookStatus> {
  try {
    const providerData = await listTikTokWebhookConfig(
      eventType as TikTokWebhookEventType
    );
    const callbackUrl = findCallbackUrl(providerData);
    return {
      eventType,
      providerReachable: true,
      configured: Boolean(callbackUrl),
      callbackMatchesExpected: callbackUrl === expectedUrl,
      callbackUrl,
      errorCode: null,
    };
  } catch (error) {
    return {
      eventType,
      providerReachable: false,
      configured: false,
      callbackMatchesExpected: false,
      callbackUrl: null,
      errorCode: providerErrorCode(error),
    };
  }
}

async function authorize() {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return {
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
      context: null,
    };
  }

  if (!canManageWorkspace(context.role)) {
    return {
      response: NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      ),
      context: null,
    };
  }

  // These endpoints mutate the globally configured TikTok developer app. They
  // must never become a customer-facing production control.
  if (!isStagingDeployment()) {
    return {
      response: NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      ),
      context: null,
    };
  }

  return { response: null, context };
}

export async function GET() {
  const authz = await authorize();
  if (authz.response || !authz.context) return authz.response;

  const missingEnv = getMissingTikTokOAuthEnv().filter((name) =>
    ["TIKTOK_BUSINESS_APP_ID", "TIKTOK_BUSINESS_APP_SECRET"].includes(name)
  );
  const expectedUrl = expectedWebhookUrl();

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        success: true,
        data: {
          expectedCallbackUrl: expectedUrl,
          providerConfigured: false,
          missingConfiguration: missingEnv,
          statuses: MANAGED_EVENT_TYPES.map((eventType) => ({
            eventType,
            providerReachable: false,
            configured: false,
            callbackMatchesExpected: false,
            callbackUrl: null,
            errorCode: "TIKTOK_WEBHOOK_ENV_MISSING",
          } satisfies WebhookStatus)),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const statuses = await Promise.all(
    MANAGED_EVENT_TYPES.map((eventType) =>
      readEventStatus(eventType, expectedUrl)
    )
  );

  return NextResponse.json(
    {
      success: true,
      data: {
        expectedCallbackUrl: expectedUrl,
        providerConfigured: statuses.every(
          (status) => status.callbackMatchesExpected
        ),
        missingConfiguration: [],
        statuses,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const authz = await authorize();
  if (authz.response || !authz.context) return authz.response;

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid input" },
      { status: 400 }
    );
  }

  const missingEnv = getMissingTikTokOAuthEnv().filter((name) =>
    ["TIKTOK_BUSINESS_APP_ID", "TIKTOK_BUSINESS_APP_SECRET"].includes(name)
  );
  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "TikTok developer app configuration is incomplete",
        missingConfiguration: missingEnv,
      },
      { status: 409 }
    );
  }

  // Requiring a currently connected account narrows this global app-level
  // mutation to the controlled staging workspace that is actually performing
  // provider QA. The webhook configuration itself remains app-level.
  const connectedAccount = await prisma.tikTokAccount.findFirst({
    where: {
      workspaceId: authz.context.workspaceId,
      refreshTokenExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!connectedAccount) {
    return NextResponse.json(
      {
        success: false,
        error: "Connect the staging TikTok Business Account before configuring webhooks",
      },
      { status: 409 }
    );
  }

  const expectedUrl = expectedWebhookUrl();
  const eventTypes = parsed.data.eventTypes ?? [...MANAGED_EVENT_TYPES];

  const updates = await Promise.all(
    eventTypes.map(async (eventType) => {
      try {
        await updateTikTokWebhook({
          eventType: eventType as TikTokWebhookEventType,
          callbackUrl: expectedUrl,
        });
        return { eventType, updated: true as const, errorCode: null };
      } catch (error) {
        return {
          eventType,
          updated: false as const,
          errorCode: providerErrorCode(error),
        };
      }
    })
  );

  const statuses = await Promise.all(
    MANAGED_EVENT_TYPES.map((eventType) =>
      readEventStatus(eventType, expectedUrl)
    )
  );
  const allRequestedConfigured = eventTypes.every((eventType) =>
    statuses.some(
      (status) =>
        status.eventType === eventType && status.callbackMatchesExpected
    )
  );

  await prisma.operationalEvent
    .create({
      data: {
        workspaceId: authz.context.workspaceId,
        source: "SYSTEM",
        level: allRequestedConfigured ? "INFO" : "WARNING",
        message: allRequestedConfigured
          ? "TikTok staging webhook configuration verified"
          : "TikTok staging webhook configuration was not fully verified",
        payload: {
          eventTypes,
          expectedCallbackUrl: expectedUrl,
          verifiedEventTypes: statuses
            .filter((status) => status.callbackMatchesExpected)
            .map((status) => status.eventType),
          failedUpdateEventTypes: updates
            .filter((update) => !update.updated)
            .map((update) => update.eventType),
        },
      },
    })
    .catch(() => {});

  return NextResponse.json(
    {
      success: allRequestedConfigured,
      data: {
        expectedCallbackUrl: expectedUrl,
        providerConfigured: statuses.every(
          (status) => status.callbackMatchesExpected
        ),
        updates,
        statuses,
      },
      ...(!allRequestedConfigured
        ? {
            error:
              "TikTok did not confirm every requested webhook configuration. Review the per-event status and provider permissions.",
          }
        : {}),
    },
    {
      status: allRequestedConfigured ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
