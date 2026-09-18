import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import type {
  SocialCommentEvent,
  SocialMessageEvent,
} from "@/lib/social-platform";
import { matchKeywords } from "@/lib/utils/keyword-matcher";

type PlannedAction =
  | { type: "PUBLIC_REPLY"; text: string }
  | { type: "DM_REPLY"; text: string };

type BlockedAction = {
  type: PlannedAction["type"];
  reason: "ACCOUNT_CAPABILITY_DISABLED" | "MESSAGE_MISSING";
};

type RoutingPlan = {
  trigger: "COMMENT" | "MESSAGE";
  actions: PlannedAction[];
  blocked: BlockedAction[];
};

type AutomationForRouting = {
  id: string;
  keywords: string[];
  matchAnyWord: boolean;
  wholeWordMatch: boolean;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  dmReplyEnabled: boolean;
  dmMessage: string | null;
  tiktokAccount: {
    publicReplyEnabled: boolean;
    messagingEnabled: boolean;
  };
};

function keywordMatch(
  automation: AutomationForRouting,
  text: string
): { matched: boolean; matchedKeyword: string | null } {
  if (automation.matchAnyWord) {
    return { matched: true, matchedKeyword: null };
  }
  return matchKeywords(
    text,
    automation.keywords,
    automation.wholeWordMatch
  );
}

function buildCommentPlan(automation: AutomationForRouting): RoutingPlan {
  const actions: PlannedAction[] = [];
  const blocked: BlockedAction[] = [];

  if (automation.publicReplyEnabled) {
    const text = automation.publicReplyMessage?.trim();
    if (!text) {
      blocked.push({ type: "PUBLIC_REPLY", reason: "MESSAGE_MISSING" });
    } else if (!automation.tiktokAccount.publicReplyEnabled) {
      blocked.push({
        type: "PUBLIC_REPLY",
        reason: "ACCOUNT_CAPABILITY_DISABLED",
      });
    } else {
      actions.push({ type: "PUBLIC_REPLY", text });
    }
  }

  return { trigger: "COMMENT", actions, blocked };
}

function buildMessagePlan(automation: AutomationForRouting): RoutingPlan {
  const actions: PlannedAction[] = [];
  const blocked: BlockedAction[] = [];

  if (automation.dmReplyEnabled) {
    const text = automation.dmMessage?.trim();
    if (!text) {
      blocked.push({ type: "DM_REPLY", reason: "MESSAGE_MISSING" });
    } else if (!automation.tiktokAccount.messagingEnabled) {
      blocked.push({ type: "DM_REPLY", reason: "ACCOUNT_CAPABILITY_DISABLED" });
    } else {
      actions.push({ type: "DM_REPLY", text });
    }
  }

  return { trigger: "MESSAGE", actions, blocked };
}

function asJson(plan: RoutingPlan): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(plan)) as Prisma.InputJsonValue;
}

/**
 * Match one normalized TikTok comment against additive TikTok campaigns and
 * persist inert action plans. No TikTok API request is made here.
 *
 * createMany(skipDuplicates) makes routing replay-safe independently from the
 * provider receipt layer. If ingress retries after the receipt was committed,
 * the same automation/event pair is not planned twice.
 */
export async function routeTikTokCommentAutomation(input: {
  workspaceId: string;
  tiktokAccountId: string;
  event: SocialCommentEvent;
}) {
  const automations = await prisma.tikTokAutomation.findMany({
    where: {
      workspaceId: input.workspaceId,
      tiktokAccountId: input.tiktokAccountId,
      isActive: true,
      commentTriggerEnabled: true,
      OR: [
        { matchAnyVideo: true },
        { videoId: input.event.contentId },
      ],
    },
    select: {
      id: true,
      keywords: true,
      matchAnyWord: true,
      wholeWordMatch: true,
      publicReplyEnabled: true,
      publicReplyMessage: true,
      dmReplyEnabled: true,
      dmMessage: true,
      tiktokAccount: {
        select: {
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const matches = automations.flatMap((automation) => {
    const result = keywordMatch(automation, input.event.text);
    if (!result.matched) return [];

    return [
      {
        workspaceId: input.workspaceId,
        tiktokAccountId: input.tiktokAccountId,
        automationId: automation.id,
        eventType: "COMMENT_INSERT",
        providerEventId: input.event.commentId,
        matchedKeyword: result.matchedKeyword,
        inputText: input.event.text,
        contentId: input.event.contentId,
        conversationId: null,
        actorId: input.event.authorId,
        actorUsername: input.event.authorUsername ?? null,
        plan: asJson(buildCommentPlan(automation)),
      },
    ];
  });

  if (matches.length === 0) return { matched: 0, inserted: 0 };

  const inserted = await prisma.tikTokAutomationMatch.createMany({
    data: matches,
    skipDuplicates: true,
  });

  return { matched: matches.length, inserted: inserted.count };
}

/**
 * Match one normalized inbound TikTok DM. This path never plans a cold DM:
 * the event already represents a user-created conversation, and the plan is
 * blocked unless the connected account currently has messaging capability.
 */
export async function routeTikTokMessageAutomation(input: {
  workspaceId: string;
  tiktokAccountId: string;
  event: SocialMessageEvent;
}) {
  const automations = await prisma.tikTokAutomation.findMany({
    where: {
      workspaceId: input.workspaceId,
      tiktokAccountId: input.tiktokAccountId,
      isActive: true,
      messageTriggerEnabled: true,
    },
    select: {
      id: true,
      keywords: true,
      matchAnyWord: true,
      wholeWordMatch: true,
      publicReplyEnabled: true,
      publicReplyMessage: true,
      dmReplyEnabled: true,
      dmMessage: true,
      tiktokAccount: {
        select: {
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const matches = automations.flatMap((automation) => {
    const result = keywordMatch(automation, input.event.text);
    if (!result.matched) return [];

    return [
      {
        workspaceId: input.workspaceId,
        tiktokAccountId: input.tiktokAccountId,
        automationId: automation.id,
        eventType: "MESSAGE_INBOUND",
        providerEventId: input.event.messageId,
        matchedKeyword: result.matchedKeyword,
        inputText: input.event.text,
        contentId: null,
        conversationId: input.event.conversationId,
        actorId: input.event.senderId,
        actorUsername: input.event.senderUsername ?? null,
        plan: asJson(buildMessagePlan(automation)),
      },
    ];
  });

  if (matches.length === 0) return { matched: 0, inserted: 0 };

  const inserted = await prisma.tikTokAutomationMatch.createMany({
    data: matches,
    skipDuplicates: true,
  });

  return { matched: matches.length, inserted: inserted.count };
}
