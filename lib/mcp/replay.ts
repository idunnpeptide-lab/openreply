import { createHash } from "crypto";
import IORedis from "ioredis";

let redis: IORedis | null = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required for MCP OAuth replay protection");
  redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  return redis;
}

export async function consumeAuthorizationCode(code: string, expiresInSeconds = 300) {
  const client = getRedis();
  if (client.status === "wait") {
    await client.connect();
  }
  const digest = createHash("sha256").update(code).digest("hex");
  const key = "replyhalo:mcp:oauth-code:" + digest;
  const result = await client.set(key, "1", "EX", expiresInSeconds, "NX");
  return result === "OK";
}
