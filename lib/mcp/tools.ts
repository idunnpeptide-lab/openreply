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
    readOnlyHint: boolean;
    destructiveHint: false;
    idempotentHint: boolean;
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
  {
    name: "replyhalo_analyze_video",
    title: "Analyze and transcribe a Reel",
    description: "Start a background Trend Watch analysis of a Reel already collected in the authorized workspace, including Whisper transcription. Returns queued/running status; use replyhalo_get_video_analysis to check completion. The 'code' must identify a workspace Reel, not an arbitrary URL.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string", minLength: 6, maxLength: 30, description: "Instagram Reel shortcode (e.g. DbOQEKCuQHc)" } },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "replyhalo_rewrite_script",
    title: "Create original voiceover from transcript",
    description: "Generate a fresh editable voiceover script from a previously completed Trend Watch Reel analysis, preserving broad theme and relevant keywords, optionally tailored to the creator's product. This runs AI generation; it never publishes content.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", minLength: 6, maxLength: 30 },
        product: { type: "string", maxLength: 1000, description: "Optional factual description of your product or offer" },
        keywords: { type: "string", maxLength: 350 },
        language: { type: "string", enum: ["original", "uk", "en", "fr", "de", "es", "it", "pl"], default: "original" },
      },
      required: ["code"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "replyhalo_sync_competitor",
    title: "Sync competitor Reel history",
    description: "Start a background refresh of previously tracked Instagram competitor Reel history in this workspace. Does not create or modify Instagram posting/DM automations. Re-run get_top_reels later to inspect collected videos.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", minLength: 1, maxLength: 100, description: "Tracked competitor Instagram username" },
      },
      required: ["username"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "replyhalo_get_top_reels",
    title: "Get a competitor's most-viewed Reels",
    description: "Return the most-viewed collected Reels for a tracked Instagram competitor, ranked by play count across all available history. Pagination and sorting happen on the Trend Watch server; historical coverage depends on scraper availability.",
    inputSchema: {
      type: "object",
      properties: {
        username: { type: "string", minLength: 1, maxLength: 100 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        offset: { type: "integer", minimum: 0, default: 0 },
        period: { type: "string", enum: ["1d", "3d", "7d", "30d", "90d", "all"], default: "all" },
      },
      required: ["username"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_device_status",
    title: "Check Mobile Studio test Android status",
    description: "Read whether your isolated Android test device is connected and which official apps are installed. Requires Mobile Studio host setup and workspace admin rights. Does not publish anything.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_list_content",
    title: "List prepared video files in Mobile Studio Content folder",
    description: "Show ready MP4 assets and approved captions from the owner's Content folder; does not upload or publish.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_run_status",
    title: "Check the status and authorization of an AI publication run",
    description: "Read a previously approved batch. The human authorizes runs in ReplyHalo Mobile Studio; the AI cannot approve itself.",
    inputSchema: {
      type: "object",
      properties: { run_id: { type: "string", pattern: "^[a-f0-9]{32}$" } },
      required: ["run_id"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_ui_snapshot",
    title: "Inspect current Android application controls",
    description: "Return labeled, accessible Android UI elements with coordinates. Operates only within a previously human-approved publication run.",
    inputSchema: {
      type: "object",
      properties: { run_id: { type: "string", pattern: "^[a-f0-9]{32}$" } },
      required: ["run_id"], additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_import_content",
    title: "Import approved video into Android gallery",
    description: "Copy one explicitly authorized Content MP4 into the Android media gallery. This does not post it.",
    inputSchema: {
      type: "object",
      properties: {
        run_id: { type: "string", pattern: "^[a-f0-9]{32}$" },
        content_id: { type: "string", pattern: "^[A-Za-z0-9_-]{1,80}$" },
      },
      required: ["run_id", "content_id"], additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_ui_action",
    title: "Perform an Android UI action for an approved publication",
    description: "Tap, swipe, type ASCII text or go back on the active test Android. Only for a human-approved content batch. Observe the UI before acting, stop if uncertain, respect app/copyright rules. Publishing may be performed within the explicitly approved batch; do not generate engagement/likes as a warm-up or bypass platform protections.",
    inputSchema: {
      type: "object",
      properties: {
        run_id: { type: "string", pattern: "^[a-f0-9]{32}$" },
        action: { type: "string", enum: ["tap", "swipe", "type", "back"] },
        x: { type: "integer", minimum: 0, maximum: 3000 },
        y: { type: "integer", minimum: 0, maximum: 4000 },
        x1: { type: "integer", minimum: 0, maximum: 3000 },
        y1: { type: "integer", minimum: 0, maximum: 4000 },
        x2: { type: "integer", minimum: 0, maximum: 3000 },
        y2: { type: "integer", minimum: 0, maximum: 4000 },
        duration_ms: { type: "integer", minimum: 100, maximum: 1500, default: 400 },
        text: { type: "string", minLength: 1, maxLength: 2000 },
      },
      required: ["run_id", "action"], additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "replyhalo_mobile_open_app",
    title: "Open a social app on the test Android",
    description: "Open an installed Instagram, TikTok or YouTube app on the authorized test Android. This does NOT upload, post or publish. The human controls the screen and confirms publication manually.",
    inputSchema: {
      type: "object",
      properties: {
        app: { type: "string", enum: ["instagram", "tiktok", "youtube", "x"] },
      },
      required: ["app"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
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
  replyhalo_analyze_video: "mcp:trendwatch:write",
  replyhalo_rewrite_script: "mcp:trendwatch:write",
  replyhalo_sync_competitor: "mcp:trendwatch:write",
  replyhalo_get_top_reels: "mcp:trendwatch:read",
  replyhalo_get_inbox_summary: "mcp:inbox:read",
  replyhalo_mobile_device_status: "mcp:mobile:read",
  replyhalo_mobile_open_app: "mcp:mobile:write",
  replyhalo_mobile_list_content: "mcp:mobile:read",
  replyhalo_mobile_run_status: "mcp:mobile:read",
  replyhalo_mobile_ui_snapshot: "mcp:mobile:read",
  replyhalo_mobile_import_content: "mcp:mobile:write",
  replyhalo_mobile_ui_action: "mcp:mobile:write",
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
      message: ok ? "MCP tool completed" : "MCP tool failed",
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

function reelCode(value: unknown) {
  const raw = str(value).trim();
  // Accept Reel shortcodes only; video must already exist in the workspace.
  if (!/^[A-Za-z0-9_-]{6,30}$/.test(raw)) {
    throw new Error("A valid tracked Instagram Reel shortcode is required");
  }
  return raw;
}

function competitorUsername(value: unknown) {
  const name = str(value).trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(name)) {
    throw new Error("A valid tracked Instagram competitor username is required");
  }
  return name.toLowerCase();
}

async function mobileStudioGateway(
  claims: McpAccessClaims,
  path: string,
  method: "GET" | "POST",
  body?: unknown
) {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: claims.workspaceId,
        userId: claims.userId,
      },
    },
    select: { role: true },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    throw new Error("Workspace admin permission is required for Mobile Studio");
  }
  const host = process.env.MOBILE_STUDIO_API_URL;
  const token = process.env.MOBILE_STUDIO_API_TOKEN;
  if (!host || !token || token.length < 32) {
    throw new Error("Mobile Studio Android host has not been provisioned yet");
  }
  let url: URL;
  try {
    url = new URL(host);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error("HTTPS host is required");
    }
  } catch {
    throw new Error("Invalid Mobile Studio gateway configuration");
  }
  if (!/^(device|content|apps\/(instagram|tiktok|youtube|x)\/open|runs\/[a-f0-9]{32}(?:\/ui(?:\/(tap|swipe|type|back))?|\/content\/[A-Za-z0-9_-]{1,80}\/import)?)$/.test(path)) {
    throw new Error("Invalid Mobile Studio action");
  }
  const response = await fetch(
    url.origin + url.pathname.replace(/\/$/, "") + "/v1/" + path,
    {
      method,
      headers: { Authorization: "Bearer " + token, Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data && typeof data.error === "string" ? data.error : "Test Android unavailable"
    );
  }
  return data;
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
    } else if (name === "replyhalo_analyze_video") {
      const code = reelCode(args.code);
      // Starting analysis only queues a job; poll the read tool for transcript.
      const response = await trendWatchRequest<{ status: string }>(
        claims.workspaceId,
        "/v1/analysis/" + encodeURIComponent(code),
        { method: "POST" }
      );
      result = { code, status: response.status, next_tool: "replyhalo_get_video_analysis" };
    } else if (name === "replyhalo_rewrite_script") {
      const code = reelCode(args.code);
      const product = str(args.product).trim();
      const keywords = str(args.keywords).trim();
      const language = str(args.language, "original");
      if (product.length > 1000 || keywords.length > 350) {
        throw new Error("Product description or keywords exceed the allowed length");
      }
      const supported = ["original", "uk", "en", "fr", "de", "es", "it", "pl"];
      if (!supported.includes(language)) throw new Error("Unsupported voiceover language");
      const response = await trendWatchRequest<{ text: string; provider: string; model: string }>(
        claims.workspaceId,
        "/v1/analysis/" + encodeURIComponent(code) + "/rewrite",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product, keywords, language }),
        }
      );
      result = { code, ...response };
    } else if (name === "replyhalo_sync_competitor") {
      const username = competitorUsername(args.username);
      // Do not start a broad workspace sync through MCP: restrict the action
      // to an account that is already tracked in the authenticated workspace.
      const accounts = await trend<{ items: Array<{ username: string }> }>(
        claims.workspaceId, "/v1/accounts"
      );
      if (!(accounts.items || []).some((account) => account.username.toLowerCase() === username)) {
        throw new Error("Track this competitor in your Trend Watch workspace before syncing");
      }
      const response = await trendWatchRequest<{ started: boolean; reason?: string }>(
        claims.workspaceId,
        "/v1/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [username] }),
        }
      );
      result = { username, ...response, next_tool: "replyhalo_get_top_reels" };
    } else if (name === "replyhalo_get_top_reels") {
      const username = competitorUsername(args.username);
      const limit = num(args.limit, 20, 1, 100);
      const offset = num(args.offset, 0, 0, 100000);
      const period = ["1d", "3d", "7d", "30d", "90d", "all"].includes(str(args.period))
        ? str(args.period) : "all";
      const params = new URLSearchParams({
        username, period, sort: "plays", min_outlier: "0",
        limit: String(limit), offset: String(offset),
      });
      const response = await trend<{ items?: unknown[]; total?: number; has_more?: boolean }>(
        claims.workspaceId, "/v1/outliers?" + params.toString()
      );
      result = {
        username, period, sort: "plays", items: response.items || [],
        total: response.total ?? 0, offset,
        has_more: Boolean(response.has_more),
      };
    } else if (name === "replyhalo_mobile_list_content") {
      result = await mobileStudioGateway(claims, "content", "GET");
    } else if (name === "replyhalo_mobile_run_status") {
      const runId = str(args.run_id);
      if (!/^[a-f0-9]{32}$/.test(runId)) throw new Error("Invalid approved run ID");
      result = await mobileStudioGateway(claims, "runs/" + runId, "GET");
    } else if (name === "replyhalo_mobile_ui_snapshot") {
      const runId = str(args.run_id);
      if (!/^[a-f0-9]{32}$/.test(runId)) throw new Error("Invalid approved run ID");
      result = await mobileStudioGateway(claims, "runs/" + runId + "/ui", "GET");
    } else if (name === "replyhalo_mobile_import_content") {
      const runId = str(args.run_id), contentId = str(args.content_id);
      if (!/^[a-f0-9]{32}$/.test(runId) || !/^[A-Za-z0-9_-]{1,80}$/.test(contentId)) {
        throw new Error("Invalid batch run or content ID");
      }
      result = await mobileStudioGateway(claims, "runs/" + runId + "/content/" + contentId + "/import", "POST");
    } else if (name === "replyhalo_mobile_ui_action") {
      const runId = str(args.run_id), action = str(args.action);
      if (!/^[a-f0-9]{32}$/.test(runId) || !["tap", "swipe", "type", "back"].includes(action)) {
        throw new Error("Invalid approved run or UI action");
      }
      const numeric = (key: string, low: number, high: number): number => {
        const value = args[key];
        if (typeof value !== "number" || !Number.isInteger(value) || value < low || value > high) {
          throw new Error("Invalid Android UI coordinate: " + key);
        }
        return value;
      };
      let body: Record<string, unknown> = {};
      if (action === "tap") body = { x: numeric("x", 0, 3000), y: numeric("y", 0, 4000) };
      if (action === "swipe") {
        body = {
          x1: numeric("x1", 0, 3000), y1: numeric("y1", 0, 4000),
          x2: numeric("x2", 0, 3000), y2: numeric("y2", 0, 4000),
          duration_ms: args.duration_ms === undefined ? 400 : numeric("duration_ms", 100, 1500),
        };
      }
      if (action === "type") {
        const value = str(args.text);
        if (value.length < 1 || value.length > 2000) throw new Error("Invalid Android text length");
        body = { text: value };
      }
      result = await mobileStudioGateway(claims, "runs/" + runId + "/ui/" + action, "POST", body);
    } else if (name === "replyhalo_mobile_device_status") {
      result = await mobileStudioGateway(claims, "device", "GET");
    } else if (name === "replyhalo_mobile_open_app") {
      const app = str(args.app);
      if (!["instagram", "tiktok", "youtube", "x"].includes(app)) {
        throw new Error("Choose instagram, tiktok or youtube");
      }
      const allowedPath = ("apps/" + app + "/open") as
        "apps/instagram/open" | "apps/tiktok/open" | "apps/youtube/open" | "apps/x/open";
      result = await mobileStudioGateway(claims, allowedPath, "POST");
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
