import { prisma } from "@/lib/db/client";
import { refreshLongLivedToken } from "@/lib/meta/client";
import { decryptToken, encryptToken } from "@/lib/meta/oauth";

export const INSTAGRAM_TOKEN_REFRESH_WINDOW_DAYS = 10;

export type InstagramTokenRefreshResult = {
  instagramAccountId: string;
  username: string;
  status: "refreshed" | "failed";
  error?: string;
};

export async function refreshExpiringInstagramTokens(options?: {
  now?: Date;
  daysBeforeExpiry?: number;
}) {
  const now = options?.now ?? new Date();
  const daysBeforeExpiry =
    options?.daysBeforeExpiry ?? INSTAGRAM_TOKEN_REFRESH_WINDOW_DAYS;
  const cutoffDate = new Date(
    now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000
  );

  const accountsToRefresh = await prisma.instagramAccount.findMany({
    where: {
      accessToken: { not: "" },
      tokenExpiresAt: {
        not: null,
        lte: cutoffDate,
      },
    },
    select: {
      id: true,
      workspaceId: true,
      username: true,
      accessToken: true,
    },
  });

  const results: InstagramTokenRefreshResult[] = [];

  for (const account of accountsToRefresh) {
    try {
      const currentToken = decryptToken(account.accessToken);
      const { accessToken: newToken, expiresIn } =
        await refreshLongLivedToken(currentToken);
      const encryptedToken = encryptToken(newToken);
      const newExpiry = new Date(now.getTime() + expiresIn * 1000);

      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptedToken,
          tokenExpiresAt: newExpiry,
        },
      });

      results.push({
        instagramAccountId: account.id,
        username: account.username,
        status: "refreshed",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await prisma.operationalEvent.create({
        data: {
          workspaceId: account.workspaceId,
          source: "TOKEN_REFRESH",
          level: "ERROR",
          message: `Token refresh failed for @${account.username}: ${errorMessage}`,
          payload: {
            instagramAccountId: account.id,
            username: account.username,
          },
        },
      });

      results.push({
        instagramAccountId: account.id,
        username: account.username,
        status: "failed",
        error: errorMessage,
      });
    }
  }

  return {
    totalProcessed: accountsToRefresh.length,
    refreshed: results.filter((result) => result.status === "refreshed").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
