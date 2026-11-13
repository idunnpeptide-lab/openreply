import { createHmac } from "node:crypto";
import { requireEnv } from "@/lib/env";

export type SupoClipWorkflow = "highlights" | "series" | "topic" | "recap" | "trailer";
export type SupoClipClipLength = "auto" | "short" | "medium" | "long";

export type SupoClipTask = {
  id: string;
  status?: string;
  progress?: number;
  progress_message?: string | null;
  error_code?: string | null;
  source_title?: string | null;
  source_duration_seconds?: number | null;
  clips_count?: number;
  workflow?: string;
  [key: string]: unknown;
};

export type SupoClipClip = {
  id: string;
  text?: string;
  reasoning?: string;
  clip_order?: number;
  duration?: number;
  start_time?: string;
  end_time?: string;
  video_url?: string;
  virality_score?: number;
  hook_score?: number;
  engagement_score?: number;
  value_score?: number;
  shareability_score?: number;
  hook_title?: string | null;
  hook_type?: string | null;
  [key: string]: unknown;
};

function baseUrl() {
  return requireEnv("SUPOCLIP_API_URL").replace(/\/$/, "");
}

let cachedServiceUserId: string | null = null;

function authBootstrapConfigured() {
  return Boolean(
    process.env.SUPOCLIP_AUTH_URL &&
      process.env.SUPOCLIP_SERVICE_EMAIL &&
      process.env.SUPOCLIP_SERVICE_PASSWORD &&
      process.env.SUPOCLIP_AUTH_SECRET
  );
}

async function parseBetterAuthUser(response: Response): Promise<string | null> {
  const payload = (await response.json().catch(() => null)) as
    | { user?: { id?: unknown } }
    | null;
  return typeof payload?.user?.id === "string" && payload.user.id
    ? payload.user.id
    : null;
}

async function resolveServiceUserId(): Promise<string> {
  const configured = process.env.SUPOCLIP_USER_ID?.trim();
  if (configured) return configured;
  if (cachedServiceUserId) return cachedServiceUserId;

  const authUrl = process.env.SUPOCLIP_AUTH_URL?.replace(/\/$/, "");
  const email = process.env.SUPOCLIP_SERVICE_EMAIL?.trim();
  const password = process.env.SUPOCLIP_SERVICE_PASSWORD;
  if (!authUrl || !email || !password) {
    throw new Error(
      "Configure SUPOCLIP_USER_ID or SUPOCLIP_AUTH_URL + service credentials"
    );
  }

  const headers = {
    "content-type": "application/json",
    origin: authUrl,
  };

  const signIn = await fetch(authUrl + "/api/auth/sign-in/email", {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (signIn.ok) {
    const id = await parseBetterAuthUser(signIn);
    if (id) {
      cachedServiceUserId = id;
      return id;
    }
  }

  const signUp = await fetch(authUrl + "/api/auth/sign-up/email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: process.env.SUPOCLIP_SERVICE_NAME?.trim() || "ReplyHalo Engine",
      email,
      password,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (signUp.ok) {
    const id = await parseBetterAuthUser(signUp);
    if (id) {
      cachedServiceUserId = id;
      return id;
    }
  }

  // Another instance may have created the account between sign-in and sign-up.
  const retry = await fetch(authUrl + "/api/auth/sign-in/email", {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (retry.ok) {
    const id = await parseBetterAuthUser(retry);
    if (id) {
      cachedServiceUserId = id;
      return id;
    }
  }

  const detail = await retry.text().catch(() => "");
  throw new Error(
    `Could not initialize SupoClip service user (${retry.status}): ${detail.slice(0, 300)}`
  );
}

async function authHeaders(): Promise<Record<string, string>> {
  const secret = process.env.SUPOCLIP_AUTH_SECRET?.trim();
  if (secret) {
    const userId = await resolveServiceUserId();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret)
      .update(`${userId}:${timestamp}`)
      .digest("hex");
    return {
      "x-supoclip-user-id": userId,
      "x-supoclip-ts": timestamp,
      "x-supoclip-signature": signature,
    };
  }

  const apiKey = process.env.SUPOCLIP_API_KEY?.trim();
  if (apiKey) return { Authorization: `Bearer ${apiKey}` };

  throw new Error(
    "Configure SupoClip HMAC service auth or SUPOCLIP_API_KEY"
  );
}

export function getVideoClipperConfigStatus() {
  const hasHmac = Boolean(
    process.env.SUPOCLIP_API_URL &&
      process.env.SUPOCLIP_AUTH_SECRET &&
      (process.env.SUPOCLIP_USER_ID || authBootstrapConfigured())
  );
  const hasApiKey = Boolean(
    process.env.SUPOCLIP_API_URL && process.env.SUPOCLIP_API_KEY
  );
  return {
    configured: hasHmac || hasApiKey,
    authMode: hasHmac ? "hmac" : hasApiKey ? "api_key" : null,
    apiUrl: process.env.SUPOCLIP_API_URL ? process.env.SUPOCLIP_API_URL.replace(/\/$/, "") : null,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(baseUrl() + path, {
    ...init,
    headers: {
      ...(await authHeaders()),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SupoClip ${response.status}: ${text.slice(0, 800)}`);
  }
  return response.json() as Promise<T>;
}

export async function createSupoClipTask(input: {
  sourceUrl: string;
  workflow?: SupoClipWorkflow;
  clipLength?: SupoClipClipLength;
  topic?: string;
  instructions?: string;
}) {
  const body: Record<string, unknown> = {
    source: { url: input.sourceUrl },
    workflow: input.workflow ?? "highlights",
    clip_length: input.clipLength ?? "auto",
  };
  if (input.instructions?.trim()) body.instructions = input.instructions.trim().slice(0, 500);
  if (input.workflow === "topic" && input.topic?.trim()) {
    body.workflow_options = { topic: input.topic.trim().slice(0, 120) };
  }
  return request<SupoClipTask>("/tasks/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSupoClipTask(taskId: string) {
  return request<SupoClipTask>(`/tasks/${encodeURIComponent(taskId)}`);
}

export async function getSupoClipClips(taskId: string) {
  const payload = await request<SupoClipClip[] | { clips?: SupoClipClip[] }>(
    `/tasks/${encodeURIComponent(taskId)}/clips`
  );
  return Array.isArray(payload) ? payload : payload.clips ?? [];
}

export async function getSupoClipFile(taskId: string, clipId: string) {
  const response = await fetch(
    baseUrl() + `/tasks/${encodeURIComponent(taskId)}/clips/${encodeURIComponent(clipId)}/file`,
    {
      headers: await authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
      redirect: "follow",
    }
  );
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`SupoClip file ${response.status}: ${text.slice(0, 500)}`);
  }
  return response;
}


export async function checkSupoClipConnection() {
  const startedAt = Date.now();
  try {
    await request<unknown>("/tasks/workflows");
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Video engine unavailable",
    };
  }
}
