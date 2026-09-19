import { prisma } from "@/lib/db/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type DiagnosticActionType = "PUBLIC_REPLY" | "DM_REPLY";
type DiagnosticBlockedReason =
  | "ACCOUNT_CAPABILITY_DISABLED"
  | "MESSAGE_MISSING";

function boundedLimit(value?: number) {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(value as number)));
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function planSummary(value: unknown) {
  const plan = asObject(value);
  const actionsRaw = Array.isArray(plan?.actions) ? plan.actions : [];
  const blockedRaw = Array.isArray(plan?.blocked) ? plan.blocked : [];

  const actionTypes: DiagnosticActionType[] = [];
  for (const entry of actionsRaw) {
    const item = asObject(entry);
    const type = item?.type;
    if (type === "PUBLIC_REPLY" || type === "DM_REPLY") {
      actionTypes.push(type);
    }
  }

  const blocked: Array<{
    type: DiagnosticActionType;
    reason: DiagnosticBlockedReason;
  }> = [];
  for (const entry of blockedRaw) {
    const item = asObject(entry);
    const type = item?.type;
    const reason = item?.reason;
    if (
      (type === "PUBLIC_REPLY" || type === "DM_REPLY") &&
      (reason === "ACCOUNT_CAPABILITY_DISABLED" || reason === "MESSAGE_MISSING")
    ) {
      blocked.push({ type, reason });
    }
  }

  let trigger: "COMMENT" | "MESSAGE" | null = null;
  if (plan?.trigger === "COMMENT" || plan?.trigger === "MESSAGE") {
    trigger = plan.trigger;
  }

  return {
    trigger,
    actionTypes,
    blocked,
  };
}

function sanitizedOperationalPayload(value: unknown) {
  const payload = asObject(value);
  if (!payload) return null;

  const allowedKeys = [
    "matchId",
    "automationEventType",
    "providerEventId",
    "actionType",
    "providerActionId",
    "code",
    "status",
    "blocker",
  ] as const;

  const sanitized: Record<string, string | number | boolean | null> = {};
  for (const key of allowedKeys) {
    const item = payload[key];
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      sanitized[key] = item;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

/**
 * Workspace-scoped, sanitized TikTok staging diagnostics.
 *
 * Deliberately excluded from the returned shape:
 * - `inputText` (comment/DM content)
 * - action text stored inside `plan`
 * - actor IDs/usernames
 * - conversation IDs
 * - provider tokens/credentials
 * - arbitrary raw OperationalEvent payload fields
 */
export async function getTikTokExecutionDiagnostics(input: {
  workspaceId: string;
  limit?: number;
}) {
  const limit = boundedLimit(input.limit);

  const [matches, operationalEvents] = await Promise.all([
    prisma.tikTokAutomationMatch.findMany({
      where: { workspaceId: input.workspaceId },
      select: {
        id: true,
        automationId: true,
        eventType: true,
        providerEventId: true,
        matchedKeyword: true,
        plan: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        automation: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.operationalEvent.findMany({
      where: {
        workspaceId: input.workspaceId,
        source: "WORKER",
        message: { startsWith: "TikTok" },
      },
      select: {
        id: true,
        level: true,
        message: true,
        payload: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return {
    matches: matches.map((match) => ({
      id: match.id,
      automationId: match.automationId,
      automationName: match.automation.name,
      eventType: match.eventType,
      providerEventId: match.providerEventId,
      matchedKeyword: match.matchedKeyword,
      status: match.status,
      plan: planSummary(match.plan),
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
    })),
    operationalEvents: operationalEvents.map((event) => ({
      id: event.id,
      level: event.level,
      message: event.message,
      payload: sanitizedOperationalPayload(event.payload),
      createdAt: event.createdAt.toISOString(),
      resolvedAt: event.resolvedAt?.toISOString() ?? null,
    })),
  };
}
