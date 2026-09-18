import { NextResponse } from "next/server";
import {
  licenseErrorToSettingsCode,
  validateDmMagnetWorkspaceLicense,
} from "@/lib/dm-magnet-license";
import { getBaseUrl, getMissingTikTokOAuthEnv } from "@/lib/env";
import {
  createTikTokOAuthState,
  getTikTokAuthorizationUrl,
} from "@/lib/tiktok/oauth";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export async function GET() {
  const context = await getCurrentWorkspaceContext();
  const baseUrl = getBaseUrl();

  if (!context) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.redirect(`${baseUrl}/settings?tiktok=forbidden`);
  }

  try {
    await validateDmMagnetWorkspaceLicense(context.workspaceId);
  } catch (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings?license=${licenseErrorToSettingsCode(error)}`
    );
  }

  const missingEnv = getMissingTikTokOAuthEnv();
  if (missingEnv.length > 0) {
    return NextResponse.redirect(
      `${baseUrl}/settings?tiktok=misconfigured&missing=${encodeURIComponent(
        missingEnv.join(",")
      )}`
    );
  }

  const state = createTikTokOAuthState(context.workspaceId);
  return NextResponse.redirect(getTikTokAuthorizationUrl(state));
}
