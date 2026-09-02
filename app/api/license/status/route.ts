import { NextResponse } from "next/server";
import {
  DmMagnetLicenseError,
  getDmMagnetLicenseConfig,
  validateDmMagnetLicense,
} from "@/lib/dm-magnet-license";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export async function GET() {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const config = getDmMagnetLicenseConfig();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          valid: null,
        },
      });
    }

    const license = await validateDmMagnetLicense();

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
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
          valid: false,
          error: error.code,
        },
      });
    }

    throw error;
  }
}
