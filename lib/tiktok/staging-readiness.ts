export const TIKTOK_LIVE_EXECUTION_ENABLED = false;

export type TikTokCapabilitySnapshot = {
  commentsEnabled: boolean;
  publicReplyEnabled: boolean;
  messagingEnabled: boolean;
  commentToMessageEnabled: boolean;
  webhookConfigured: boolean;
};

export type TikTokStagingReadiness = {
  commentCampaignReady: boolean;
  dmCampaignReady: boolean;
  commentToMessageReady: boolean;
  webhookReady: boolean;
  liveExecutionEnabled: boolean;
  blockers: string[];
};

/**
 * Derives only staging/configuration readiness from the stored provider
 * capability snapshot. Live action execution stays deliberately disabled until
 * the TikTok developer app + test Business Account complete staging E2E.
 */
export function getTikTokStagingReadiness(
  account: TikTokCapabilitySnapshot
): TikTokStagingReadiness {
  const commentCampaignReady =
    account.commentsEnabled && account.publicReplyEnabled;
  const dmCampaignReady = account.messagingEnabled;
  const commentToMessageReady =
    account.messagingEnabled && account.commentToMessageEnabled;
  const blockers: string[] = [];

  if (!account.webhookConfigured) {
    blockers.push("TikTok webhook configuration is not confirmed");
  }
  if (!account.commentsEnabled) {
    blockers.push("Comment access is not granted");
  }
  if (!account.publicReplyEnabled) {
    blockers.push("Public comment reply capability is not granted");
  }
  if (!account.messagingEnabled) {
    blockers.push("Business Messaging capability is not granted");
  }
  if (!account.commentToMessageEnabled) {
    blockers.push("Comment-to-Message is not enabled for this account");
  }
  if (!TIKTOK_LIVE_EXECUTION_ENABLED) {
    blockers.push("ReplyHalo live TikTok execution is still locked for staging QA");
  }

  return {
    commentCampaignReady,
    dmCampaignReady,
    commentToMessageReady,
    webhookReady: account.webhookConfigured,
    liveExecutionEnabled: TIKTOK_LIVE_EXECUTION_ENABLED,
    blockers,
  };
}
