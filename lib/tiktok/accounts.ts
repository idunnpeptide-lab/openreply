import { prisma } from "@/lib/db/client";
import {
  decryptTikTokToken,
  encryptTikTokToken,
  refreshTikTokAccessToken,
} from "@/lib/tiktok/oauth";

const REFRESH_SKEW_MS = 5 * 60 * 1000;

export class TikTokAccountAuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TIKTOK_ACCOUNT_NOT_FOUND"
      | "TIKTOK_REFRESH_TOKEN_EXPIRED"
      | "TIKTOK_ACCOUNT_CHANGED"
  ) {
    super(message);
    this.name = "TikTokAccountAuthError";
  }
}

export function getTikTokCapabilitiesFromScopes(scopes: string[]) {
  const granted = new Set(scopes);

  return {
    commentsEnabled: granted.has("comment.list"),
    publicReplyEnabled: granted.has("comment.list.manage"),
    messagingEnabled:
      granted.has("message.list.read") && granted.has("message.list.send"),
  };
}

export async function canConnectTikTokAccount({
  workspaceId,
  openId,
}: {
  workspaceId: string;
  openId: string;
}) {
  const existingAccount = await prisma.tikTokAccount.findUnique({
    where: { openId },
    select: { workspaceId: true },
  });

  if (existingAccount && existingAccount.workspaceId !== workspaceId) {
    return {
      allowed: false,
      reason: "already_connected" as const,
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export async function getWorkspaceTikTokAccount(
  workspaceId: string,
  tiktokAccountId?: string | null
) {
  if (tiktokAccountId && tiktokAccountId !== "all") {
    return prisma.tikTokAccount.findFirst({
      where: {
        id: tiktokAccountId,
        workspaceId,
      },
    });
  }

  return prisma.tikTokAccount.findFirst({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
  });
}

export async function getValidTikTokAccessToken(
  tiktokAccountId: string,
  now = new Date()
): Promise<string> {
  const account = await prisma.tikTokAccount.findUnique({
    where: { id: tiktokAccountId },
  });

  if (!account) {
    throw new TikTokAccountAuthError(
      "TikTok account was not found",
      "TIKTOK_ACCOUNT_NOT_FOUND"
    );
  }

  if (account.tokenExpiresAt.getTime() > now.getTime() + REFRESH_SKEW_MS) {
    return decryptTikTokToken(account.accessTokenEncrypted);
  }

  if (account.refreshTokenExpiresAt.getTime() <= now.getTime()) {
    throw new TikTokAccountAuthError(
      "TikTok refresh token has expired and the account must reconnect",
      "TIKTOK_REFRESH_TOKEN_EXPIRED"
    );
  }

  const refreshed = await refreshTikTokAccessToken(
    decryptTikTokToken(account.refreshTokenEncrypted)
  );

  if (refreshed.openId !== account.openId) {
    throw new TikTokAccountAuthError(
      "TikTok token refresh returned a different account",
      "TIKTOK_ACCOUNT_CHANGED"
    );
  }

  const tokenExpiresAt = new Date(now.getTime() + refreshed.expiresIn * 1000);
  const refreshTokenExpiresAt = new Date(
    now.getTime() + refreshed.refreshTokenExpiresIn * 1000
  );
  const capabilities = getTikTokCapabilitiesFromScopes(refreshed.scopes);

  await prisma.tikTokAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptTikTokToken(refreshed.accessToken),
      refreshTokenEncrypted: encryptTikTokToken(refreshed.refreshToken),
      tokenExpiresAt,
      refreshTokenExpiresAt,
      grantedScopes: refreshed.scopes,
      ...capabilities,
    },
  });

  return refreshed.accessToken;
}
