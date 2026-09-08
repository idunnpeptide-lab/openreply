import { createHash, createHmac, randomBytes } from "node:crypto";

const SERVICE_AUTH_VERSION = "v1";

export const DM_MAGNET_SERVICE_AUTH_HEADERS = {
  timestamp: "x-dm-magnet-timestamp",
  nonce: "x-dm-magnet-nonce",
  signature: "x-dm-magnet-signature",
} as const;

export function buildDmMagnetServiceAuthHeaders(input: {
  secret: string;
  method: string;
  path: string;
  body: string;
  now?: Date;
  nonce?: string;
}) {
  const timestamp = Math.floor(
    (input.now?.getTime() ?? Date.now()) / 1000
  ).toString();
  const nonce = input.nonce ?? randomBytes(18).toString("base64url");
  const bodyHash = createHash("sha256").update(input.body, "utf8").digest("hex");
  const canonical = [
    SERVICE_AUTH_VERSION,
    timestamp,
    nonce,
    input.method.toUpperCase(),
    input.path,
    bodyHash,
  ].join("\n");

  const signature = createHmac("sha256", input.secret)
    .update(canonical, "utf8")
    .digest("hex");

  return {
    [DM_MAGNET_SERVICE_AUTH_HEADERS.timestamp]: timestamp,
    [DM_MAGNET_SERVICE_AUTH_HEADERS.nonce]: nonce,
    [DM_MAGNET_SERVICE_AUTH_HEADERS.signature]: `${SERVICE_AUTH_VERSION}=${signature}`,
  };
}
