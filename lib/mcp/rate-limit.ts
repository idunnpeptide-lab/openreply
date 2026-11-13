import { createHash } from "crypto";
import IORedis from "ioredis";
import { requireEnv } from "@/lib/env";

let redis: IORedis | null = null;

function getRedis() {
  if (redis) return redis;
  redis = new IORedis(requireEnv("REDIS_URL"), {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  return redis;
}

export async function checkMcpRateLimit(input: {
  workspaceId: string;
  clientId: string;
  limit?: number;
}) {
  const limit = input.limit ?? 120;
  const now = Date.now();
  const window = Math.floor(now / 60_000);
  const clientHash = createHash("sha256")
    .update(input.clientId)
    .digest("hex")
    .slice(0, 20);
  const key = `replyhalo:mcp:rate:${input.workspaceId}:${clientHash}:${window}`;

  const client = getRedis();
  if (client.status === "wait") await client.connect();

  const pipeline = client.multi();
  pipeline.incr(key);
  pipeline.expire(key, 75);
  const result = await pipeline.exec();
  const count = Number(result?.[0]?.[1] ?? 0);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, 60 - Math.floor((now % 60_000) / 1000)),
  };
}
