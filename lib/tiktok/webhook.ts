import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { requireEnv } from "@/lib/env";
import {
  TIKTOK_BUSINESS_API_BASE_URL,
  TIKTOK_BUSINESS_API_VERSION,
} from "@/lib/tiktok/config";

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type TikTokWebhookEventType =
  | "DIRECT_MESSAGE"
  | "BRAND_MENTION"
  | "VIDEO"
  | "COMMENT";

export type TikTokWebhookEnvelope = {
  clientKey: string;
  event: string;
  createTime: number;
  userOpenId: string | null;
  contentRaw: string;
  content: unknown;
};

export type TikTokWebhookSignatureResult =
  | { valid: true; timestamp: number }
  | {
      valid: false;
      reason: "missing" | "malformed" | "stale" | "mismatch";
      timestamp?: number;
    };

type TikTokApiEnvelope<T> = {
  code: number;
  message: string;
  request_id?: string;
  data?: T;
};

export class TikTokWebhookError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TikTokWebhookError";
  }
}

function parseSignatureHeader(value: string | null) {
  if (!value) return null;

  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of value.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const fieldValue = part.slice(separator + 1).trim();
    if (key === "t") timestamp = Number(fieldValue);
    if (key === "s") signature = fieldValue.toLowerCase();
  }

  if (
    !Number.isSafeInteger(timestamp) ||
    (timestamp as number) <= 0 ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return null;
  }

  return { timestamp: timestamp as number, signature };
}

export function verifyTikTokWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  clientSecret?: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): TikTokWebhookSignatureResult {
  if (!input.signatureHeader) return { valid: false, reason: "missing" };

  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return { valid: false, reason: "malformed" };

  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const toleranceSeconds =
    input.toleranceSeconds ?? DEFAULT_SIGNATURE_TOLERANCE_SECONDS;

  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return { valid: false, reason: "stale", timestamp: parsed.timestamp };
  }

  const clientSecret =
    input.clientSecret ?? requireEnv("TIKTOK_BUSINESS_APP_SECRET");
  const expected = createHmac("sha256", clientSecret)
    .update(`${parsed.timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");

  const suppliedBuffer = Buffer.from(parsed.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: "mismatch", timestamp: parsed.timestamp };
  }

  return { valid: true, timestamp: parsed.timestamp };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTikTokWebhookEnvelope(
  rawBody: string
): TikTokWebhookEnvelope {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new TikTokWebhookError(
      "TikTok webhook body is not valid JSON",
      "TIKTOK_WEBHOOK_INVALID_JSON",
      400
    );
  }

  if (!isRecord(payload)) {
    throw new TikTokWebhookError(
      "TikTok webhook payload must be an object",
      "TIKTOK_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  const clientKey = payload.client_key;
  const event = payload.event;
  const createTime = payload.create_time;
  const userOpenId = payload.user_openid;
  const contentRaw = payload.content;

  if (
    typeof clientKey !== "string" ||
    !clientKey.trim() ||
    typeof event !== "string" ||
    !event.trim() ||
    !Number.isFinite(createTime) ||
    typeof contentRaw !== "string"
  ) {
    throw new TikTokWebhookError(
      "TikTok webhook envelope is incomplete",
      "TIKTOK_WEBHOOK_INVALID_PAYLOAD",
      400
    );
  }

  let content: unknown = contentRaw;
  try {
    content = JSON.parse(contentRaw);
  } catch {
    // Keep the raw string. Event-specific schemas are intentionally not assumed
    // here because TikTok evolves webhook event payloads independently.
  }

  return {
    clientKey: clientKey.trim(),
    event: event.trim(),
    createTime: Number(createTime),
    userOpenId:
      typeof userOpenId === "string" && userOpenId.trim()
        ? userOpenId.trim()
        : null,
    contentRaw,
    content,
  };
}

export function buildTikTokWebhookDedupeKey(input: {
  rawBody: string;
  signatureTimestamp: number;
}) {
  return createHash("sha256")
    .update(`${input.signatureTimestamp}.${input.rawBody}`, "utf8")
    .digest("hex");
}

function webhookEndpoint(path: string) {
  return `${TIKTOK_BUSINESS_API_BASE_URL}/${TIKTOK_BUSINESS_API_VERSION}${path}`;
}

async function requestWebhookConfig<T>(input: {
  path: "/business/webhook/update/" | "/business/webhook/list/" | "/business/webhook/delete/";
  method: "GET" | "POST";
  eventType: TikTokWebhookEventType;
  callbackUrl?: string;
  itemList?: string[];
}) {
  const appId = requireEnv("TIKTOK_BUSINESS_APP_ID");
  const secret = requireEnv("TIKTOK_BUSINESS_APP_SECRET");
  const url = new URL(webhookEndpoint(input.path));
  const common = {
    app_id: appId,
    secret,
    event_type: input.eventType,
  };

  let body: string | undefined;
  if (input.method === "GET") {
    for (const [key, value] of Object.entries(common)) {
      url.searchParams.set(key, value);
    }
  } else {
    body = JSON.stringify({
      ...common,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
      ...(input.itemList ? { item_list: input.itemList } : {}),
    });
  }

  const response = await fetch(url, {
    method: input.method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokApiEnvelope<T>
    | null;

  if (!response.ok || !payload || payload.code !== 0) {
    throw new TikTokWebhookError(
      payload?.message || `TikTok webhook configuration request failed with HTTP ${response.status}`,
      payload ? String(payload.code) : "TIKTOK_WEBHOOK_CONFIG_HTTP_ERROR",
      response.status || 502
    );
  }

  return payload.data;
}

export async function updateTikTokWebhook(input: {
  eventType: TikTokWebhookEventType;
  callbackUrl: string;
  itemList?: string[];
}) {
  const callbackUrl = new URL(input.callbackUrl);
  if (callbackUrl.protocol !== "https:") {
    throw new TikTokWebhookError(
      "TikTok webhook callback URL must use HTTPS",
      "TIKTOK_WEBHOOK_CALLBACK_INVALID",
      400
    );
  }

  return requestWebhookConfig<unknown>({
    path: "/business/webhook/update/",
    method: "POST",
    eventType: input.eventType,
    callbackUrl: callbackUrl.toString(),
    itemList: input.itemList,
  });
}

export async function listTikTokWebhookConfig(
  eventType: TikTokWebhookEventType
) {
  return requestWebhookConfig<unknown>({
    path: "/business/webhook/list/",
    method: "GET",
    eventType,
  });
}

export async function deleteTikTokWebhook(
  eventType: TikTokWebhookEventType
) {
  return requestWebhookConfig<unknown>({
    path: "/business/webhook/delete/",
    method: "POST",
    eventType,
  });
}
