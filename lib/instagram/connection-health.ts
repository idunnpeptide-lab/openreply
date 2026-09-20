export type InstagramTokenHealth =
  | "HEALTHY"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "UNKNOWN";

export type InstagramConnectionHealth = {
  connected: boolean;
  token: InstagramTokenHealth;
  webhookReady: boolean;
  overall: "READY" | "NEEDS_ATTENTION" | "DISCONNECTED";
  reasons: string[];
};

const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export function getInstagramConnectionHealth(
  account: {
    accessToken: string;
    tokenExpiresAt: Date | null;
    webhookSubscribed: boolean;
  },
  now = new Date()
): InstagramConnectionHealth {
  const connected = account.accessToken.trim().length > 0;

  let token: InstagramTokenHealth = "UNKNOWN";
  if (account.tokenExpiresAt) {
    const remaining = account.tokenExpiresAt.getTime() - now.getTime();
    token =
      remaining <= 0
        ? "EXPIRED"
        : remaining <= EXPIRING_SOON_MS
          ? "EXPIRING_SOON"
          : "HEALTHY";
  }

  const reasons: string[] = [];
  if (!connected) reasons.push("Instagram is disconnected");
  if (token === "EXPIRED") reasons.push("Instagram authorization has expired");
  if (token === "EXPIRING_SOON") reasons.push("Instagram authorization expires soon");
  if (token === "UNKNOWN") reasons.push("Instagram authorization expiry is unavailable");
  if (!account.webhookSubscribed) reasons.push("Instagram automation webhook is not ready");

  const overall = !connected
    ? "DISCONNECTED"
    : token === "HEALTHY" && account.webhookSubscribed
      ? "READY"
      : "NEEDS_ATTENTION";

  return {
    connected,
    token,
    webhookReady: account.webhookSubscribed,
    overall,
    reasons,
  };
}
