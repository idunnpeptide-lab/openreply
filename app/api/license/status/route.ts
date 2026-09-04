import { NextRequest, NextResponse } from "next/server";
import {
  configureDmMagnetWorkspaceLicense,
  DmMagnetLicenseError,
  getDmMagnetLicenseServerConfig,
  getDmMagnetWorkspaceLicenseMetadata,
  validateDmMagnetWorkspaceLicense,
} from "@/lib/dm-magnet-license";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export async function GET() {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const metadata = await getDmMagnetWorkspaceLicenseMetadata(
    context.workspaceId
  );
  const serverConfig = getDmMagnetLicenseServerConfig();

  if (!serverConfig) {
    return NextResponse.json({
      success: true,
      data: {
        enabled: false,
        configured: metadata.configured,
        keyPrefix: metadata.keyPrefix,
        valid: null,
      },
    });
  }

  if (!metadata.configured) {
    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        configured: false,
        keyPrefix: null,
        valid: null,
      },
    });
  }

  try {
    const license = await validateDmMagnetWorkspaceLicense(
      context.workspaceId
    );

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        configured: true,
        keyPrefix: metadata.keyPrefix,
        valid: true,
        plan: license?.plan ?? null,
        status: license?.status ?? null,
        maxAccounts: license?.maxAccounts ?? null,
        usedAccounts: license?.usedAccounts ?? null,
        availableAccounts: license?.availableAccounts ?? null,
        expiresAt: license?.expiresAt ?? null,
      },
    });
  } catch (error) {
    if (error instanceof DmMagnetLicenseError) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: true,
          configured: true,
          keyPrefix: metadata.keyPrefix,
          valid: false,
          error: error.code,
        },
      });
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!canManageWorkspace(context.role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Only workspace owners and admins can configure licensing",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const licenseKey =
    typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";

  if (!licenseKey) {
    return NextResponse.json(
      { success: false, error: "License Key is required" },
      { status: 400 }
    );
  }

  try {
    const license = await configureDmMagnetWorkspaceLicense(
      context.workspaceId,
      licenseKey
    );
    const metadata = await getDmMagnetWorkspaceLicenseMetadata(
      context.workspaceId
    );

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        configured: true,
        keyPrefix: metadata.keyPrefix,
        valid: true,
        plan: license.plan,
        status: license.status,
        maxAccounts: license.maxAccounts,
        usedAccounts: license.usedAccounts,
        availableAccounts: license.availableAccounts,
        expiresAt: license.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof DmMagnetLicenseError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: error.status }
      );
    }

    throw error;
  }
}
