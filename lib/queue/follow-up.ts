import { FOLLOWUP_JOB_NAME, getDMQueue } from "./client";

type FollowUpAutomation = {
  id: string;
  followUpEnabled: boolean;
  followUpMessage: string | null;
  followUpDelayMinutes: number | null;
  instagramAccount: {
    instagramId: string;
  };
};

export async function scheduleFollowUpIfEnabled(input: {
  automation: FollowUpAutomation;
  userId: string;
  commenterName: string | null;
}): Promise<boolean> {
  const { automation, userId, commenterName } = input;

  if (!automation.followUpEnabled || !automation.followUpMessage?.trim()) {
    return false;
  }

  await getDMQueue().add(
    FOLLOWUP_JOB_NAME,
    {
      instagramAccountId: automation.instagramAccount.instagramId,
      userId,
      automationId: automation.id,
      commenterName,
    },
    {
      delay: Math.max(0, automation.followUpDelayMinutes ?? 0) * 60_000,
      jobId: `followup_${automation.id}_${userId}`,
    }
  );

  return true;
}
