import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const accessMocks = vi.hoisted(() => ({
  context: vi.fn(),
  canManage: vi.fn(),
}));
const envMocks = vi.hoisted(() => ({
  baseUrl: vi.fn(),
  missing: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  accountFindFirst: vi.fn(),
  operationalCreate: vi.fn(),
}));
const webhookMocks = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  getCurrentWorkspaceContext: accessMocks.context,
  canManageWorkspace: accessMocks.canManage,
}));

vi.mock("@/lib/env", () => ({
  getBaseUrl: envMocks.baseUrl,
  getMissingTikTokOAuthEnv: envMocks.missing,
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    tikTokAccount: {
      findFirst: dbMocks.accountFindFirst,
    },
    operationalEvent: {
      create: dbMocks.operationalCreate,
    },
  },
}));

vi.mock("@/lib/tiktok/webhook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/tiktok/webhook")>();
  return {
    ...actual,
    listTikTokWebhookConfig: webhookMocks.list,
    updateTikTokWebhook: webhookMocks.update,
  };
});

import {
  GET,
  POST,
} from "../app/api/admin/diagnostics/tiktok-webhooks/route";

const CALLBACK = "https://replyhalo-web-staging.up.railway.app/api/tiktok/webhook";

function post(body: Record<string, unknown> = {}) {
  return new NextRequest(
    "https://replyhalo-web-staging.up.railway.app/api/admin/diagnostics/tiktok-webhooks",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  accessMocks.context.mockResolvedValue({
    userId: "user_1",
    workspaceId: "workspace_1",
    workspace: { id: "workspace_1" },
    role: "OWNER",
  });
  accessMocks.canManage.mockReturnValue(true);
  envMocks.baseUrl.mockReturnValue("https://replyhalo-web-staging.up.railway.app");
  envMocks.missing.mockReturnValue([]);
  dbMocks.accountFindFirst.mockResolvedValue({ id: "tt_1" });
  dbMocks.operationalCreate.mockResolvedValue({});
  webhookMocks.update.mockResolvedValue({});
  webhookMocks.list.mockImplementation((eventType: string) =>
    Promise.resolve({
      event_type: eventType,
      callback_url: CALLBACK,
    })
  );
});

describe("TikTok staging webhook configuration API", () => {
  it("reads only sanitized provider webhook state for the staging callback", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(webhookMocks.list).toHaveBeenCalledTimes(2);
    expect(payload).toMatchObject({
      success: true,
      data: {
        expectedCallbackUrl: CALLBACK,
        providerConfigured: true,
        missingConfiguration: [],
        statuses: [
          {
            eventType: "COMMENT",
            providerReachable: true,
            configured: true,
            callbackMatchesExpected: true,
            callbackUrl: CALLBACK,
            errorCode: null,
          },
          {
            eventType: "DIRECT_MESSAGE",
            providerReachable: true,
            configured: true,
            callbackMatchesExpected: true,
            callbackUrl: CALLBACK,
            errorCode: null,
          },
        ],
      },
    });
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("configures both staging webhook families and verifies provider readback", async () => {
    const response = await POST(post());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(webhookMocks.update).toHaveBeenCalledTimes(2);
    expect(webhookMocks.update).toHaveBeenCalledWith({
      eventType: "COMMENT",
      callbackUrl: CALLBACK,
    });
    expect(webhookMocks.update).toHaveBeenCalledWith({
      eventType: "DIRECT_MESSAGE",
      callbackUrl: CALLBACK,
    });
    expect(dbMocks.accountFindFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace_1",
        refreshTokenExpiresAt: { gt: expect.any(Date) },
      },
      select: { id: true },
    });
    expect(dbMocks.operationalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace_1",
        level: "INFO",
        message: "TikTok staging webhook configuration verified",
      }),
    });
  });

  it("fails closed when provider update says success but readback does not match", async () => {
    webhookMocks.list.mockResolvedValue({
      callback_url: "https://wrong.example/api/tiktok/webhook",
    });

    const response = await POST(post({ eventTypes: ["COMMENT"] }));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.success).toBe(false);
    expect(payload.data.statuses[0]).toMatchObject({
      eventType: "COMMENT",
      configured: true,
      callbackMatchesExpected: false,
      callbackUrl: "https://wrong.example/api/tiktok/webhook",
    });
  });

  it("requires a connected staging TikTok account before app-level mutation", async () => {
    dbMocks.accountFindFirst.mockResolvedValue(null);

    const response = await POST(post());

    expect(response.status).toBe(409);
    expect(webhookMocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 outside staging and never calls TikTok", async () => {
    envMocks.baseUrl.mockReturnValue("https://app.replyhalo.com");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(webhookMocks.list).not.toHaveBeenCalled();
    expect(webhookMocks.update).not.toHaveBeenCalled();
  });

  it("requires owner/admin access", async () => {
    accessMocks.canManage.mockReturnValue(false);

    const response = await POST(post());

    expect(response.status).toBe(403);
    expect(webhookMocks.update).not.toHaveBeenCalled();
  });
});
