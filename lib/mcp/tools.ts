import { prisma } from "@/lib/db/client";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import { getConversations, MetaApiError } from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";
import { isTrendWatchConfigured, trendWatchRequest } from "@/lib/trend-watch/server";
import type { McpAccessClaims, McpScope } from "@/lib/mcp/auth";

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: true;
    destructiveHint: false;
    idempotentHint: true;
    openWorldHint: boolean;
  };
};

export const MCP_TOOLS: ToolDefinition[] = [
  {
    name: "replyhalo_list_instagram_accounts",
    title: "List Instagram accounts",
    description: "List Instagram accounts connected to the authenticated ReplyHalo workspace. Never returns access tokens or secrets.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_get_campaigns",
    title: "Get ReplyHalo campaigns",
    description: "Return recent Instagram automation campaigns for the authenticated workspace, including status and basic targeting information.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 25 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_get_outliers",
    title: "Get Trend Watch outliers",
    description: "Return high-performing Instagram Reels from Trend Watch with outlier, velocity, engagement, virality and score metrics.",
    inputSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["1d", "3d", "7d", "30d", "90d", "all"], default: "7d" },
        min_outlier: { type: "number", minimum: 0, default: 2 },
        sort: { type: "string", enum: ["score", "outlier", "velocity", "plays", "er"], default: "score" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_search_reels",
    title: "Search Instagram Reels",
    description: "Search Instagram discovery by a free-text keyword or topic and return popular Reels plus related keywords.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, maxLength: 120 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "replyhalo_get_similar_accounts",
    title: "Find similar Instagram accounts",
    description: "Find Instagram accounts similar to a tracked or supplied public username using the Trend Watch collector.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", minLength: 1, maxLength: 100 },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      required: ["username"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "replyhalo_get_instagram_trends",
    title: "Get Instagram trends",
    description: "Return the current Instagram trend cards collected by Trend Watch for this workspace.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 30 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "replyhalo_get_saved_ideas",
    title: "Get saved Reel ideas",
    description: "Return Reels saved as content ideas in Trend Watch.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 30 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_get_video_analysis",
    title: "Get Reel video analysis",
    description: "Return an existing Trend Watch video analysis for a Reel code, including pacing, transcript and AI breakdown when available.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", minLength: 1, maxLength: 200 } },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_get_inbox_summary",
    title: "Get Instagram inbox summary",
    description: "Read the latest Instagram DM conversations for a connected account. This tool never sends messages.",
    inputSchema: {
      type: "object",
      properties: {
        instagram_account_id: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 20 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
];

const TOOL_SCOPES: Record<string, McpScope> = {
  replyhalo_list_instagram_accounts: "mcp:instagram:read",
  replyhalo_get_campaigns: "mcp:campaigns:read",
  replyhalo_get_outliers: "mcp:trendwatch:read",
  replyhalo_search_reels: "mcp:trendwatch:read",
  replyhalo_get_similar_accounts: "mcp:trendwatch:read",
  replyhalo_get_instagram_trends: "mcp:trendwatch:read",
  replyhalo_get_saved_ideas: "mcp:trendwatch:read",
  replyhalo_get_video_analysis: "mcp:trendwatch:read",
  replyhalo_get_inbox_summary: "mcp:inbox:read",
};

function num(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

async function audit(claims: McpAccessClaims, tool: string, ok: boolean, details?: Record<string, unknown>) {
  await prisma.operationalEvent.create({
    data: {
      source: "SYSTEM",
      level: ok ? "INFO" : "WARNING",
      workspaceId: claims.workspaceId,
      message: ok ? "MCP read tool completed" : "MCP read tool failed",
      payload: {
        userId: claims.userId,
        clientId: claims.clientId.slice(0, 24),
        tool,
        ...(details || {}),
      },
    },
  }).catch(() => {});
}

export async function assertMcpMembership(claims: McpAccessClaims) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: claims.workspaceId,
        userId: claims.userId,
      },
    },
    select: { id: true },
  });
  return Boolean(membership);
}

function requireToolScope(claims: McpAccessClaims, tool: string) {
  const required = TOOL_SCOPES[tool];
  return required ? claims.scopes.includes(required) : false;
}

async function scraperSearch(query: string) {
  const base = process.env.TRENDWATCH_SCRAPER_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Trend Watch scraper is not configured");
  const url = new URL(base + "/search/keywords");
  url.searchParams.set("query", query);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Instagram keyword search failed"
    );
  }
  return payload as Record<string, unknown>;
}

async function trend<T>(workspaceId: string, path: string): Promise<T> {
  if (!isTrendWatchConfigured()) {
    throw new Error("Trend Watch backend is not configured");
  }
  return trendWatchRequest<T>(workspaceId, path);
}

export async function callMcpTool(
  claims: McpAccessClaims,
  name: string,
  args: Record<string, unknown>
) {
  if (!requireToolScope(claims, name)) {
    throw new Error("INSUFFICIENT_SCOPE");
  }

  try {
    let result: unknown;

    if (name === "replyhalo_list_instagram_accounts") {
      result = await prisma.instagramAccount.findMany({
        where: { workspaceId: claims.workspaceId },
        select: {
          id: true,
          instagramId: true,
          username: true,
          name: true,
          webhookSubscribed: true,
          connectedAt: true,
          tokenExpiresAt: true,
        },
        orderBy: { connectedAt: "desc" },
      });
    } else if (name === "replyhalo_get_campaigns") {
      const limit = num(args.limit, 25, 1, 100);
      result = await prisma.automation.findMany({
        where: { workspaceId: claims.workspaceId },
        select: {
          id: true,
          name: true,
          goal: true,
          postId: true,
          postUrl: true,
          keywords: true,
          matchAnyPost: true,
          matchAnyWord: true,
          dmTriggerEnabled: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          instagramAccount: { select: { username: true, instagramId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } else if (name === "replyhalo_get_outliers") {
      const period = ["1d", "3d", "7d", "30d", "90d", "all"].includes(str(args.period))
        ? str(args.period)
        : "7d";
      const sort = ["score", "outlier", "velocity", "plays", "er"].includes(str(args.sort))
        ? str(args.sort)
        : "score";
      const minOutlier = Math.max(0, Number(args.min_outlier ?? 2) || 0);
      const limit = num(args.limit, 25, 1, 100);
      const response = await trend<{ items?: unknown[] }>(
        claims.workspaceId,
        "/v1/outliers?period=" + encodeURIComponent(period) +
          "&min_outlier=" + encodeURIComponent(String(minOutlier)) +
          "&sort=" + encodeURIComponent(sort)
      );
      result = { items: (response.items || []).slice(0, limit) };
    } else if (name === "replyhalo_search_reels") {
      const query = str(args.query).trim().slice(0, 120);
      if (!query) throw new Error("Search query is required");
      const limit = num(args.limit, 20, 1, 50);
      const response = await scraperSearch(query);
      const posts = Array.isArray(response.posts) ? response.posts.slice(0, limit) : [];
      result = {
        query,
        posts,
        related_keywords: Array.isArray(response.related_keywords)
          ? response.related_keywords
          : [],
        description: response.description ?? null,
      };
    } else if (name === "replyhalo_get_similar_accounts") {
      const username = str(args.username).trim().replace(/^@/, "").slice(0, 100);
      if (!username) throw new Error("Instagram username is required");
      const limit = num(args.limit, 20, 1, 50);
      const response = await trend<{ items?: unknown[] }>(
        claims.workspaceId,
        "/v1/similar/" + encodeURIComponent(username)
      );
      result = { username, items: (response.items || []).slice(0, limit) };
    } else if (name === "replyhalo_get_instagram_trends") {
      const limit = num(args.limit, 30, 1, 100);
      const response = await trend<{ items?: unknown[] }>(claims.workspaceId, "/v1/trends");
      result = { items: (response.items || []).slice(0, limit) };
    } else if (name === "replyhalo_get_saved_ideas") {
      const limit = num(args.limit, 30, 1, 100);
      const response = await trend<{ items?: unknown[] }>(claims.workspaceId, "/v1/saved");
      result = { items: (response.items || []).slice(0, limit) };
    } else if (name === "replyhalo_get_video_analysis") {
      const code = str(args.code).trim();
      if (!code) throw new Error("Reel code is required");
      result = await trend(claims.workspaceId, "/v1/analysis/" + encodeURIComponent(code));
    } else if (name === "replyhalo_get_inbox_summary") {
      const account = await getWorkspaceInstagramAccount(
        claims.workspaceId,
        str(args.instagram_account_id) || null
      );
      if (!account) throw new Error("Instagram account is not connected");
      const limit = num(args.limit, 20, 1, 50);
      const accessToken = decryptToken(account.accessToken);
      const conversations = await getConversations(accessToken, account.instagramId);
      result = {
        account: {
          id: account.id,
          username: account.username,
          instagramId: account.instagramId,
        },
        conversations: conversations.slice(0, limit).map((conversation) => {
          const participants = conversation.participants?.data || [];
          const contact =
            participants.find((participant) => participant.id !== account.instagramId) ||
            participants[0] ||
            null;
          const last = conversation.messages?.data?.[0] || null;
          return {
            id: conversation.id,
            contact: { id: contact?.id || "", username: contact?.username || null },
            updatedTime: conversation.updated_time || null,
            lastMessage: last
              ? {
                  text: last.message || "",
                  fromMe: last.from?.id === account.instagramId,
                  createdTime: last.created_time || null,
                }
              : null,
          };
        }),
      };
    } else {
      throw new Error("Unknown MCP tool");
    }

    await audit(claims, name, true);
    return result;
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown MCP tool error";
    await audit(claims, name, false, { reason: message });
    throw new Error(message);
  }
}
