import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

// Keep API validation aligned with the official comment reply client so a
// campaign cannot be saved successfully and then fail later at execution time.
const TIKTOK_PUBLIC_REPLY_MAX_LENGTH = 150;
const TIKTOK_DM_REPLY_MAX_LENGTH = 6000;

const keywordsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(10);

const fullConfigSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    goal: z.string().trim().min(1).max(120).nullable().optional(),
    videoId: z.string().trim().min(1).max(128).nullable(),
    matchAnyVideo: z.boolean(),
    commentTriggerEnabled: z.boolean(),
    messageTriggerEnabled: z.boolean(),
    keywords: keywordsSchema,
    matchAnyWord: z.boolean(),
    wholeWordMatch: z.boolean(),
    publicReplyEnabled: z.boolean(),
    publicReplyMessage: z
      .string()
      .trim()
      .max(TIKTOK_PUBLIC_REPLY_MAX_LENGTH)
      .nullable(),
    dmReplyEnabled: z.boolean(),
    dmMessage: z.string().trim().max(TIKTOK_DM_REPLY_MAX_LENGTH).nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.commentTriggerEnabled && !value.messageTriggerEnabled) {
      ctx.addIssue({
        code: "custom",
        path: ["commentTriggerEnabled"],
        message: "Enable at least one TikTok trigger",
      });
    }

    if (!value.matchAnyWord && value.keywords.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["keywords"],
        message: "Add at least one keyword, or match any word",
      });
    }

    if (
      value.commentTriggerEnabled &&
      !value.matchAnyVideo &&
      !value.videoId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["videoId"],
        message: "Choose a TikTok video, or match any video",
      });
    }

    if (value.commentTriggerEnabled && !value.publicReplyEnabled) {
      ctx.addIssue({
        code: "custom",
        path: ["publicReplyEnabled"],
        message:
          "Comment campaigns currently require a public reply; cold comment-to-DM is not enabled",
      });
    }

    if (
      value.publicReplyEnabled &&
      !value.publicReplyMessage?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["publicReplyMessage"],
        message: "Public reply text is required",
      });
    }

    if (value.messageTriggerEnabled && !value.dmReplyEnabled) {
      ctx.addIssue({
        code: "custom",
        path: ["dmReplyEnabled"],
        message: "Inbound DM campaigns require a DM reply",
      });
    }

    if (value.dmReplyEnabled && !value.dmMessage?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["dmMessage"],
        message: "DM reply text is required",
      });
    }
  });

const createInputSchema = z.object({
  tiktokAccountId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  goal: z.string().trim().min(1).max(120).nullable().optional(),
  videoId: z.string().trim().min(1).max(128).nullable().optional(),
  matchAnyVideo: z.boolean().optional().default(false),
  commentTriggerEnabled: z.boolean().optional().default(false),
  messageTriggerEnabled: z.boolean().optional().default(false),
  keywords: keywordsSchema.optional().default([]),
  matchAnyWord: z.boolean().optional().default(false),
  wholeWordMatch: z.boolean().optional().default(true),
  publicReplyEnabled: z.boolean().optional().default(false),
  publicReplyMessage: z
    .string()
    .trim()
    .max(TIKTOK_PUBLIC_REPLY_MAX_LENGTH)
    .nullable()
    .optional(),
  dmReplyEnabled: z.boolean().optional().default(false),
  dmMessage: z
    .string()
    .trim()
    .max(TIKTOK_DM_REPLY_MAX_LENGTH)
    .nullable()
    .optional(),
  isActive: z.boolean().optional().default(true),
});

const updateInputSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  goal: z.string().trim().min(1).max(120).nullable().optional(),
  videoId: z.string().trim().min(1).max(128).nullable().optional(),
  matchAnyVideo: z.boolean().optional(),
  commentTriggerEnabled: z.boolean().optional(),
  messageTriggerEnabled: z.boolean().optional(),
  keywords: keywordsSchema.optional(),
  matchAnyWord: z.boolean().optional(),
  wholeWordMatch: z.boolean().optional(),
  publicReplyEnabled: z.boolean().optional(),
  publicReplyMessage: z
    .string()
    .trim()
    .max(TIKTOK_PUBLIC_REPLY_MAX_LENGTH)
    .nullable()
    .optional(),
  dmReplyEnabled: z.boolean().optional(),
  dmMessage: z
    .string()
    .trim()
    .max(TIKTOK_DM_REPLY_MAX_LENGTH)
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
});

type FullConfig = z.infer<typeof fullConfigSchema>;

type CapabilitySnapshot = {
  commentsEnabled: boolean;
  publicReplyEnabled: boolean;
  messagingEnabled: boolean;
};

function normalizeConfig<T extends FullConfig>(config: T): T {
  return {
    ...config,
    goal: config.goal?.trim() || null,
    keywords: config.matchAnyWord
      ? []
      : config.keywords.map((keyword) => keyword.trim()).filter(Boolean),
    videoId:
      !config.commentTriggerEnabled || config.matchAnyVideo
        ? null
        : config.videoId?.trim() || null,
    publicReplyEnabled: config.commentTriggerEnabled
      ? config.publicReplyEnabled
      : false,
    publicReplyMessage:
      config.commentTriggerEnabled && config.publicReplyEnabled
        ? config.publicReplyMessage?.trim() || null
        : null,
    dmReplyEnabled: config.messageTriggerEnabled
      ? config.dmReplyEnabled
      : false,
    dmMessage:
      config.messageTriggerEnabled && config.dmReplyEnabled
        ? config.dmMessage?.trim() || null
        : null,
  } as T;
}

function capabilityError(
  config: FullConfig,
  capabilities: CapabilitySnapshot
): string | null {
  if (config.commentTriggerEnabled && !capabilities.commentsEnabled) {
    return "This TikTok account does not currently have comment access";
  }
  if (config.publicReplyEnabled && !capabilities.publicReplyEnabled) {
    return "This TikTok account does not currently have public-reply capability";
  }
  if (config.messageTriggerEnabled && !capabilities.messagingEnabled) {
    return "This TikTok account does not currently have Business Messaging capability";
  }
  return null;
}

function invalidInput(parsed: z.ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid input",
      details: parsed.flatten(),
    },
    { status: 400 }
  );
}

export async function GET(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const accountId = request.nextUrl.searchParams.get("tiktokAccountId");
  const automations = await prisma.tikTokAutomation.findMany({
    where: {
      workspaceId: context.workspaceId,
      ...(accountId ? { tiktokAccountId: accountId } : {}),
    },
    select: {
      id: true,
      tiktokAccountId: true,
      name: true,
      goal: true,
      videoId: true,
      matchAnyVideo: true,
      commentTriggerEnabled: true,
      messageTriggerEnabled: true,
      keywords: true,
      matchAnyWord: true,
      wholeWordMatch: true,
      publicReplyEnabled: true,
      publicReplyMessage: true,
      dmReplyEnabled: true,
      dmMessage: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      tiktokAccount: {
        select: {
          openId: true,
          username: true,
          displayName: true,
          commentsEnabled: true,
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      },
      _count: { select: { matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { success: true, data: automations },
    { headers: { "Cache-Control": "no-store" } }
  );
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
      { success: false, error: "Only owners and admins can create campaigns" },
      { status: 403 }
    );
  }

  const raw = createInputSchema.safeParse(await request.json());
  if (!raw.success) return invalidInput(raw.error);

  const candidate = normalizeConfig({
    name: raw.data.name,
    goal: raw.data.goal ?? null,
    videoId: raw.data.videoId ?? null,
    matchAnyVideo: raw.data.matchAnyVideo,
    commentTriggerEnabled: raw.data.commentTriggerEnabled,
    messageTriggerEnabled: raw.data.messageTriggerEnabled,
    keywords: raw.data.keywords,
    matchAnyWord: raw.data.matchAnyWord,
    wholeWordMatch: raw.data.wholeWordMatch,
    publicReplyEnabled: raw.data.publicReplyEnabled,
    publicReplyMessage: raw.data.publicReplyMessage ?? null,
    dmReplyEnabled: raw.data.dmReplyEnabled,
    dmMessage: raw.data.dmMessage ?? null,
    isActive: raw.data.isActive,
  });
  const validated = fullConfigSchema.safeParse(candidate);
  if (!validated.success) return invalidInput(validated.error);

  const account = await prisma.tikTokAccount.findFirst({
    where: {
      id: raw.data.tiktokAccountId,
      workspaceId: context.workspaceId,
    },
    select: {
      id: true,
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
    },
  });
  if (!account) {
    return NextResponse.json(
      { success: false, error: "TikTok account not found" },
      { status: 404 }
    );
  }

  const blocked = capabilityError(validated.data, account);
  if (blocked) {
    return NextResponse.json(
      { success: false, error: blocked },
      { status: 409 }
    );
  }

  const automation = await prisma.tikTokAutomation.create({
    data: {
      ...validated.data,
      workspaceId: context.workspaceId,
      tiktokAccountId: account.id,
    },
  });

  return NextResponse.json(
    { success: true, data: automation },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can update campaigns" },
      { status: 403 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("id");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "Missing campaign ID" },
      { status: 400 }
    );
  }

  const raw = updateInputSchema.safeParse(await request.json());
  if (!raw.success) return invalidInput(raw.error);

  const existing = await prisma.tikTokAutomation.findFirst({
    where: { id: automationId, workspaceId: context.workspaceId },
    select: {
      id: true,
      name: true,
      goal: true,
      videoId: true,
      matchAnyVideo: true,
      commentTriggerEnabled: true,
      messageTriggerEnabled: true,
      keywords: true,
      matchAnyWord: true,
      wholeWordMatch: true,
      publicReplyEnabled: true,
      publicReplyMessage: true,
      dmReplyEnabled: true,
      dmMessage: true,
      isActive: true,
      tiktokAccount: {
        select: {
          commentsEnabled: true,
          publicReplyEnabled: true,
          messagingEnabled: true,
        },
      },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Campaign not found" },
      { status: 404 }
    );
  }

  const { tiktokAccount, ...stored } = existing;
  const candidate = normalizeConfig({
    ...stored,
    ...raw.data,
  });
  const validated = fullConfigSchema.safeParse(candidate);
  if (!validated.success) return invalidInput(validated.error);

  const blocked = capabilityError(validated.data, tiktokAccount);
  if (blocked) {
    return NextResponse.json(
      { success: false, error: blocked },
      { status: 409 }
    );
  }

  const updated = await prisma.tikTokAutomation.update({
    where: { id: automationId },
    data: validated.data,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();
  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      { success: false, error: "Only owners and admins can delete campaigns" },
      { status: 403 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("id");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "Missing campaign ID" },
      { status: 400 }
    );
  }

  const existing = await prisma.tikTokAutomation.findFirst({
    where: { id: automationId, workspaceId: context.workspaceId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Campaign not found" },
      { status: 404 }
    );
  }

  await prisma.tikTokAutomation.delete({ where: { id: automationId } });
  return NextResponse.json({ success: true });
}
