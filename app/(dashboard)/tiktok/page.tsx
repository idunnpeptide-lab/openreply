import TikTokControlledSendControl from "@/components/tiktok-controlled-send-control";
import TikTokDisconnectControl from "@/components/tiktok-disconnect-control";
import TikTokExecutionDiagnostics from "@/components/tiktok-execution-diagnostics";
import TikTokStagingConsole from "@/components/tiktok-staging-console";
import TikTokWebhookStagingControl from "@/components/tiktok-webhook-staging-control";
import { prisma } from "@/lib/db/client";
import { getBaseUrl, getMissingTikTokOAuthEnv } from "@/lib/env";
import { listTikTokVideos, TikTokApiError } from "@/lib/tiktok/client";
import { getTikTokExecutionDiagnostics } from "@/lib/tiktok/execution-diagnostics";
import {
  TIKTOK_CONTROLLED_STAGING_SEND_ENABLED,
  TIKTOK_LIVE_EXECUTION_ENABLED,
} from "@/lib/tiktok/staging-readiness";
import {
  canManageWorkspace,
  getCurrentWorkspaceContext,
} from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

function stagingWebhookCallbackUrl() {
  try {
    const baseUrl = new URL(getBaseUrl());
    if (!baseUrl.hostname.toLowerCase().includes("staging")) return null;
    return new URL("/api/tiktok/webhook", baseUrl.origin).toString();
  } catch {
    return null;
  }
}

export default async function TikTokStagingPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context) {
    return (
      <div className="panel rounded p-6 text-sm text-error">
        TikTok staging is unavailable because the workspace session could not be resolved.
      </div>
    );
  }

  const canManage = canManageWorkspace(context.role);
  const webhookCallbackUrl = stagingWebhookCallbackUrl();
  const accountsRaw = await prisma.tikTokAccount.findMany({
    where: {
      workspaceId: context.workspaceId,
      refreshTokenExpiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      openId: true,
      username: true,
      displayName: true,
      tokenExpiresAt: true,
      refreshTokenExpiresAt: true,
      grantedScopes: true,
      commentsEnabled: true,
      publicReplyEnabled: true,
      messagingEnabled: true,
      commentToMessageEnabled: true,
      webhookConfigured: true,
      connectedAt: true,
      updatedAt: true,
      _count: {
        select: {
          automations: true,
          automationMatches: true,
        },
      },
    },
    orderBy: { connectedAt: "desc" },
  });

  const accounts = accountsRaw.map((account) => ({
    ...account,
    tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
    refreshTokenExpiresAt: account.refreshTokenExpiresAt?.toISOString() ?? null,
    connectedAt: account.connectedAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }));

  const selectedAccount = accounts[0] ?? null;
  let videos: Awaited<ReturnType<typeof listTikTokVideos>>["items"] = [];
  let providerError: string | null = null;

  if (selectedAccount) {
    try {
      const page = await listTikTokVideos({
        tiktokAccountId: selectedAccount.id,
        maxCount: 20,
      });
      videos = page.items;
    } catch (error) {
      providerError =
        error instanceof TikTokApiError
          ? error.message
          : "Could not load owned TikTok videos from the provider";
    }
  }

  const campaignsRaw = selectedAccount
    ? await prisma.tikTokAutomation.findMany({
        where: {
          workspaceId: context.workspaceId,
          tiktokAccountId: selectedAccount.id,
        },
        select: {
          id: true,
          tiktokAccountId: true,
          name: true,
          goal: true,
          videoId: true,
          matchAnyVideo: true,
          commentTriggerEnabled: true,
          messageTriggerEnabled: true,
          keywords: true,
          matchAnyWord: true,
          wholeWordMatch: true,
          publicReplyEnabled: true,
          publicReplyMessage: true,
          dmReplyEnabled: true,
          dmMessage: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { matches: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const campaigns = campaignsRaw.map((campaign) => ({
    ...campaign,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  }));

  const diagnostics = await getTikTokExecutionDiagnostics({
    workspaceId: context.workspaceId,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <TikTokStagingConsole
        initialStatus={{
          provider: "TIKTOK",
          phase: "STAGING_FOUNDATION",
          oauthConfigured: getMissingTikTokOAuthEnv().length === 0,
          canManage,
          liveExecutionEnabled: TIKTOK_LIVE_EXECUTION_ENABLED,
        }}
        initialAccounts={accounts}
        initialVideos={videos}
        initialCampaigns={campaigns}
        initialProviderError={providerError}
      />
      {webhookCallbackUrl && (
        <TikTokWebhookStagingControl
          canManage={canManage}
          expectedCallbackUrl={webhookCallbackUrl}
        />
      )}
      <TikTokDisconnectControl
        accounts={accounts.map(({ id, username, displayName }) => ({
          id,
          username,
          displayName,
        }))}
        canManage={canManage}
      />
      {webhookCallbackUrl && (
        <TikTokControlledSendControl
          canManage={canManage}
          liveExecutionEnabled={TIKTOK_LIVE_EXECUTION_ENABLED}
          controlledStagingSendEnabled={TIKTOK_CONTROLLED_STAGING_SEND_ENABLED}
          matches={diagnostics.matches.map((match) => ({
            id: match.id,
            automationName: match.automationName,
            status: match.status,
            eventType: match.eventType,
            plan: {
              trigger: match.plan.trigger,
              actionTypes: match.plan.actionTypes,
            },
          }))}
        />
      )}
      <div className="max-w-6xl mx-auto">
        <TikTokExecutionDiagnostics data={diagnostics} />
      </div>
    </div>
  );
}
