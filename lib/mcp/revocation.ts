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

function key(workspaceId: string, userId: string) {
  return "replyhalo:mcp:revoked-before:" + workspaceId + ":" + userId;
}

async function client() {
  const value = getRedis();
  if (value.status === "wait") await value.connect();
  return value;
}

export async function revokeAllMcpTokens(workspaceId: string, userId: string) {
  const value = await client();
  const revokedBefore = Math.floor(Date.now() / 1000);
  await value.set(key(workspaceId, userId), String(revokedBefore), "EX", 31 * 24 * 60 * 60);
  return revokedBefore;
}

export async function isMcpTokenRevoked(input: {
  workspaceId: string;
  userId: string;
  issuedAt: number;
}) {
  const value = await client();
  const raw = await value.get(key(input.workspaceId, input.userId));
  if (!raw) return false;
  const revokedBefore = Number(raw);
  return Number.isFinite(revokedBefore) && input.issuedAt <= revokedBefore;
}
