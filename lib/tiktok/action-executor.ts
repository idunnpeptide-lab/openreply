import { z } from "zod";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import { replyToTikTokComment } from "@/lib/tiktok/client";
import { sendTikTokTextMessage } from "@/lib/tiktok/messaging";
import { TIKTOK_LIVE_EXECUTION_ENABLED } from "@/lib/tiktok/staging-readiness";

const plannedActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PUBLIC_REPLY"),
    text: z.string().trim().min(1).max(150),
  }),
  z.object({
    type: z.literal("DM_REPLY"),
    text: z.string().trim().min(1).max(6000),
  }),
]);

const blockedActionSchema = z.object({
  type: z.enum(["PUBLIC_REPLY", "DM_REPLY"]),
  reason: z.enum(["ACCOUNT_CAPABILITY_DISABLED", "MESSAGE_MISSING"]),
});

const routingPlanSchema = z.object({
  trigger: z.enum(["COMMENT", "MESSAGE"]),
  actions: z.array(plannedActionSchema).max(1),
  blocked: z.array(blockedActionSchema),
});

export type TikTokExecutionResult =
  | { state: "LOCKED"; matchId: string }
  | { state: "TERMINAL"; matchId: string; status: string }
  | { state: "SKIPPED"; matchId: string; reason: string }
  | { state: "EXECUTED"; matchId: string; providerActionId: string | null }
  | { state: "FAILED"; matchId: string; code: string; message: string };

type ProviderDependencies = {
  publicReply: typeof replyToTikTokComment;
  dmReply: typeof sendTikTokTextMessage;
};

type ExecutorRuntime = {
  liveExecutionEnabled: boolean;
  providers: ProviderDependencies;
};

type MatchForExecution = {
  id: string;
  workspaceId: string;
  tiktokAccountId: string;
  eventType: string;
  providerEventId: string;
  contentId: string | null;
  conversationId: string | null;
  plan: Prisma.JsonValue;
  status: string;
  tiktokAccount: {
    commentsEnabled: boolean;
    publicReplyEnabled: boolean;
    messagingEnabled: boolean;
  };
};

function diagnosticPayload(match: MatchForExecution, extra: Record<string, unknown>) {
  return {
    provider: "TIKTOK",
    matchId: match.id,
    automationEventType: match.eventType,
    providerEventId: match.providerEventId,
    ...extra,
  } satisfies Prisma.InputJsonObject;
}

async function writeOperationalEvent(
  tx: Prisma.TransactionClient,
  match: MatchForExecution,
  input: {
    level: "INFO" | "WARNING" | "ERROR";
    message: string;
    payload?: Record<string, unknown>;
  }
) {
  await tx.operationalEvent.create({
    data: {
      workspaceId: match.workspaceId,
      source: "WORKER",
      level: input.level,
      message: input.message,
      payload: diagnosticPayload(match, input.payload ?? {}),
    },
  });
}

function providerError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & {
      code?: unknown;
      status?: unknown;
    };
    return {
      code:
        typeof candidate.code === "string"
          ? candidate.code
          : "TIKTOK_PROVIDER_ACTION_FAILED",
      message: candidate.message || "TikTok provider action failed",
      status:
        typeof candidate.status === "number" ? candidate.status : undefined,
    };
  }
  return {
    code: "TIKTOK_PROVIDER_ACTION_FAILED",
    message: "TikTok provider action failed",
    status: undefined,
  };
}

function validatePlan(match: MatchForExecution) {
  const parsed = routingPlanSchema.safeParse(match.plan);
  if (!parsed.success) {
    return {
      ok: false as const,
      code: "TIKTOK_EXECUTION_PLAN_INVALID",
      message: "Stored TikTok action plan is invalid",
    };
  }

  const plan = parsed.data;
  if (plan.trigger === "COMMENT" && match.eventType !== "COMMENT_INSERT") {
    return {
      ok: false as const,
      code: "TIKTOK_EXECUTION_EVENT_MISMATCH",
      message: "TikTok comment plan does not match the stored event type",
    };
  }
  if (plan.trigger === "MESSAGE" && match.eventType !== "MESSAGE_INBOUND") {
    return {
      ok: false as const,
      code: "TIKTOK_EXECUTION_EVENT_MISMATCH",
      message: "TikTok message plan does not match the stored event type",
    };
  }

  return { ok: true as const, plan };
}

function executionBlocker(
  match: MatchForExecution,
  action: z.infer<typeof plannedActionSchema>
): string | null {
  if (action.type === "PUBLIC_REPLY") {
    if (!match.tiktokAccount.commentsEnabled) {
      return "COMMENT_ACCESS_DISABLED";
    }
    if (!match.tiktokAccount.publicReplyEnabled) {
      return "PUBLIC_REPLY_CAPABILITY_DISABLED";
    }
    if (!match.contentId) return "VIDEO_ID_MISSING";
    return null;
  }

  if (!match.tiktokAccount.messagingEnabled) {
    return "BUSINESS_MESSAGING_CAPABILITY_DISABLED";
  }
  if (!match.conversationId) return "CONVERSATION_ID_MISSING";
  return null;
}

async function loadMatch(
  tx: Prisma.TransactionClient,
  matchId: string
): Promise<MatchForExecution | null> {
  return tx.tikTokAutomationMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      workspaceId: true,
      tiktokAccountId: true,
      eventType: true,
      providerEventId: true,
      contentId: true,
      conversationId: true,
      plan: true,
      status: true,
      tiktokAccount: {
        select: {
          commentsEnabled: true,
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      },
    },
  }) as Promise<MatchForExecution | null>;
}

/**
 * Create an executor runtime. The exported production executor below always
 * uses the hard-coded staging gate. The factory exists for focused tests and
 * for the future explicitly approved rollout change; it must not be wired to
 * user-controlled input or an environment toggle.
 *
 * When live execution is eventually approved, the row lock serializes
 * concurrent attempts for the same match and terminal match statuses prevent
 * sequential replays. No automatic retry should be added around provider send
 * calls unless TikTok exposes a provider idempotency key that ReplyHalo can
 * persist and verify. A process crash after provider acceptance but before the
 * DB commit is inherently ambiguous without such a provider key.
 */
export function createTikTokActionExecutor(runtime: ExecutorRuntime) {
  return async function executeTikTokAutomationMatch(
    matchId: string
  ): Promise<TikTokExecutionResult> {
    if (!runtime.liveExecutionEnabled) {
      return { state: "LOCKED", matchId };
    }

    return prisma.$transaction(
      async (tx) => {
        // Serialize concurrent execution attempts for this durable match. The
        // row is locked only in the future approved live runtime; the current
        // production wrapper returns above while the staging gate is false.
        await tx.$queryRaw`SELECT "id" FROM "TikTokAutomationMatch" WHERE "id" = ${matchId} FOR UPDATE`;

        const match = await loadMatch(tx, matchId);
        if (!match) {
          return {
            state: "FAILED",
            matchId,
            code: "TIKTOK_MATCH_NOT_FOUND",
            message: "TikTok automation match was not found",
          };
        }

        if (match.status !== "MATCHED") {
          return {
            state: "TERMINAL",
            matchId,
            status: match.status,
          };
        }

        const validated = validatePlan(match);
        if (!validated.ok) {
          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "FAILED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "ERROR",
            message: "TikTok action plan failed validation before execution",
            payload: { code: validated.code },
          });
          return {
            state: "FAILED",
            matchId,
            code: validated.code,
            message: validated.message,
          };
        }

        if (validated.plan.blocked.length > 0) {
          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "SKIPPED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "WARNING",
            message: "TikTok action plan was skipped because routing recorded blocked actions",
            payload: {
              blocked: validated.plan.blocked.map((item) => ({
                type: item.type,
                reason: item.reason,
              })),
            },
          });
          return {
            state: "SKIPPED",
            matchId,
            reason: "ROUTING_PLAN_BLOCKED",
          };
        }

        const action = validated.plan.actions[0];
        if (!action) {
          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "SKIPPED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "INFO",
            message: "TikTok action plan contained no executable action",
          });
          return {
            state: "SKIPPED",
            matchId,
            reason: "NO_EXECUTABLE_ACTION",
          };
        }

        const blocker = executionBlocker(match, action);
        if (blocker) {
          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "SKIPPED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "WARNING",
            message: "TikTok action was blocked by the current account capability snapshot",
            payload: { actionType: action.type, blocker },
          });
          return { state: "SKIPPED", matchId, reason: blocker };
        }

        try {
          let providerActionId: string | null = null;

          if (action.type === "PUBLIC_REPLY") {
            const reply = await runtime.providers.publicReply({
              tiktokAccountId: match.tiktokAccountId,
              videoId: match.contentId as string,
              commentId: match.providerEventId,
              text: action.text,
            });
            providerActionId = reply.comment_id?.trim() || null;
          } else {
            const reply = await runtime.providers.dmReply({
              tiktokAccountId: match.tiktokAccountId,
              conversationId: match.conversationId as string,
              text: action.text,
            });
            providerActionId = reply.messageId?.trim() || null;
          }

          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "EXECUTED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "INFO",
            message: "TikTok action executed",
            payload: {
              actionType: action.type,
              providerActionId,
            },
          });

          return {
            state: "EXECUTED",
            matchId,
            providerActionId,
          };
        } catch (error) {
          const normalized = providerError(error);
          await tx.tikTokAutomationMatch.update({
            where: { id: match.id },
            data: { status: "FAILED" },
          });
          await writeOperationalEvent(tx, match, {
            level: "ERROR",
            message: "TikTok provider action failed",
            payload: {
              code: normalized.code,
              status: normalized.status,
              // Do not persist campaign message text or credentials in
              // operational diagnostics.
            },
          });
          return {
            state: "FAILED",
            matchId,
            code: normalized.code,
            message: normalized.message,
          };
        }
      },
      { maxWait: 5_000, timeout: 20_000 }
    );
  };
}

/**
 * Production/staging entry point. This cannot send while
 * TIKTOK_LIVE_EXECUTION_ENABLED is false in source control.
 */
export const executeTikTokAutomationMatch = createTikTokActionExecutor({
  liveExecutionEnabled: TIKTOK_LIVE_EXECUTION_ENABLED,
  providers: {
    publicReply: replyToTikTokComment,
    dmReply: sendTikTokTextMessage,
  },
});
