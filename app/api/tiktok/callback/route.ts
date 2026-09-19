import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  bindDmMagnetTikTokAccount,
  DmMagnetLicenseError,
  licenseErrorToSettingsCode,
} from "@/lib/dm-magnet-license";
import { getBaseUrl } from "@/lib/env";
import {
  canConnectTikTokAccount,
  getTikTokCapabilitiesFromScopes,
} from "@/lib/tiktok/accounts";
import {
  encryptTikTokToken,
  exchangeTikTokAuthCode,
  getTikTokBusinessProfile,
  verifyTikTokOAuthState,
} from "@/lib/tiktok/oauth";
import { canManageWorkspace } from "@/lib/workspace-access";

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();
  const authCode = request.nextUrl.searchParams.get("auth_code");
  const error = request.nextUrl.searchParams.get("error");
  const state = verifyTikTokOAuthState(
    request.nextUrl.searchParams.get("state")
  );

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=denied`);
  }

  if (!authCode || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=invalid`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: state.workspaceId,
      userId: session.user.id,
    },
  });

  if (!membership || !canManageWorkspace(membership.role)) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=forbidden`);
  }

  try {
    const tokenSet = await exchangeTikTokAuthCode(authCode);
    const profile = await getTikTokBusinessProfile({
      accessToken: tokenSet.accessToken,
      openId: tokenSet.openId,
    });

    // The OAuth open_id is app-specific and stable for the authorized TikTok
    // account. Never let an upsert move an account between workspaces.
    const connection = await canConnectTikTokAccount({
      workspaceId: state.workspaceId,
      openId: tokenSet.openId,
    });

    if (!connection.allowed) {
      return NextResponse.redirect(
        `${baseUrl}/settings?tiktok=already_connected`
      );
    }

    try {
      await bindDmMagnetTikTokAccount({
        workspaceId: state.workspaceId,
        tiktokAccountId: tokenSet.openId,
        tiktokUsername: profile.username,
        instanceId: `${baseUrl}#workspace:${state.workspaceId}`,
      });
    } catch (licenseError) {
      if (licenseError instanceof DmMagnetLicenseError) {
        return NextResponse.redirect(
          `${baseUrl}/settings?license=${licenseErrorToSettingsCode(
            licenseError
          )}`
        );
      }
      throw licenseError;
    }

    const now = Date.now();
    const tokenExpiresAt = new Date(now + tokenSet.expiresIn * 1000);
    const refreshTokenExpiresAt = new Date(
      now + tokenSet.refreshTokenExpiresIn * 1000
    );
    const capabilities = getTikTokCapabilitiesFromScopes(tokenSet.scopes);
    const connectedAt = new Date(now);

    await prisma.tikTokAccount.upsert({
      where: { openId: tokenSet.openId },
      create: {
        workspaceId: state.workspaceId,
        openId: tokenSet.openId,
        username: profile.username,
        displayName: profile.displayName,
        accessTokenEncrypted: encryptTikTokToken(tokenSet.accessToken),
        refreshTokenEncrypted: encryptTikTokToken(tokenSet.refreshToken),
        tokenExpiresAt,
        refreshTokenExpiresAt,
        grantedScopes: tokenSet.scopes,
        ...capabilities,
        // Comment-to-Message and webhook availability need separate account
        // capability/configuration checks. Do not infer them from OAuth scopes.
        commentToMessageEnabled: false,
        webhookConfigured: false,
        connectedAt,
      },
      update: {
        workspaceId: state.workspaceId,
        username: profile.username,
        displayName: profile.displayName,
        accessTokenEncrypted: encryptTikTokToken(tokenSet.accessToken),
        refreshTokenEncrypted: encryptTikTokToken(tokenSet.refreshToken),
        tokenExpiresAt,
        refreshTokenExpiresAt,
        grantedScopes: tokenSet.scopes,
        ...capabilities,
        // Reconnect reuses the preserved account row/campaign history but must
        // re-prove account-dependent capability and signed webhook delivery.
        commentToMessageEnabled: false,
        webhookConfigured: false,
        connectedAt,
      },
    });

    return NextResponse.redirect(`${baseUrl}/settings?tiktok=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[TikTok Callback] Error:", err);

    await prisma.operationalEvent
      .create({
        data: {
          source: "SYSTEM",
          level: "ERROR",
          workspaceId: state.workspaceId,
          message: "TikTok connection failed",
          payload: { reason: message },
        },
      })
      .catch(() => {});

    return NextResponse.redirect(
      `${baseUrl}/settings?tiktok=failed&reason=${encodeURIComponent(
        message.slice(0, 200)
      )}`
    );
  }
}
