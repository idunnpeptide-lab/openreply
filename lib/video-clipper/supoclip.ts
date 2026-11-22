import "server-only";
import { createHmac } from "node:crypto";
import { requireEnv } from "@/lib/env";

export type SupoClipWorkflow = "highlights" | "series" | "topic" | "recap" | "trailer";
export type SupoClipClipLength = "auto" | "short" | "medium" | "long";

export type SupoClipTask = {
  id: string;
  task_id?: string;
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

async function authHeaders(): Promise<Record<string, string>> {
  const secret = process.env.SUPOCLIP_AUTH_SECRET?.trim();
  if (secret) {
    const userId = process.env.SUPOCLIP_USER_ID?.trim() || "replyhalo-service";
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

  throw new Error("Configure SupoClip HMAC service auth or SUPOCLIP_API_KEY");
}

export function getVideoClipperConfigStatus() {
  const hasHmac = Boolean(
    process.env.SUPOCLIP_API_URL && process.env.SUPOCLIP_AUTH_SECRET
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
  const created = await request<SupoClipTask & { task_id?: string }>("/tasks/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const id = created.id || created.task_id;
  if (!id) throw new Error("SupoClip create task response did not include a task id");
  return { ...created, id };
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


export type SupoClipUploadAuthorization = {
  storage?: string;
  video_path: string;
  uploadId: string;
  partSize?: number;
  parts?: Array<{ partNumber: number; url: string }>;
  [key: string]: unknown;
};

export async function authorizeSupoClipUpload(input: {
  filename: string;
  size: number;
  contentType: string;
}) {
  return request<SupoClipUploadAuthorization>("/upload/authorize", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function refreshSupoClipUploadParts(input: {
  video_path: string;
  uploadId: string;
  partNumbers: number[];
}) {
  return request<{ parts?: Array<{ partNumber: number; url: string }> }>("/upload/parts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeSupoClipUpload(input: {
  video_path: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  return request<{ video_path?: string; [key: string]: unknown }>("/upload/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function abortSupoClipUpload(input: {
  video_path: string;
  uploadId: string;
}) {
  return request<{ message?: string; [key: string]: unknown }>("/upload/abort", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
