export class TrendWatchNotConfiguredError extends Error {
  constructor() {
    super("Trend Watch backend is not configured");
    this.name = "TrendWatchNotConfiguredError";
  }
}

export class TrendWatchServiceError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "TrendWatchServiceError";
    this.status = status;
  }
}

export function isTrendWatchConfigured() {
  return Boolean(
    process.env.TRENDWATCH_API_URL && process.env.TRENDWATCH_INTERNAL_TOKEN
  );
}

export async function trendWatchRequest<T>(
  workspaceId: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const baseUrl = process.env.TRENDWATCH_API_URL?.replace(/\/$/, "");
  const internalToken = process.env.TRENDWATCH_INTERNAL_TOKEN;

  if (!baseUrl || !internalToken) {
    throw new TrendWatchNotConfiguredError();
  }

  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", "Bearer " + internalToken);
  headers.set("X-ReplyHalo-Workspace-Id", workspaceId);
  headers.set("Accept", "application/json");

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(baseUrl + normalizedPath, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Trend Watch backend returned HTTP " + response.status;

    throw new TrendWatchServiceError(message, response.status);
  }

  return payload as T;
}
