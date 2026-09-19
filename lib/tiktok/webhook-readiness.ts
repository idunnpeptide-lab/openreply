import { prisma } from "@/lib/db/client";

const CONFIRMING_TIKTOK_WEBHOOK_EVENTS = new Set([
  "comment.update",
  "im_receive_msg",
  "im_receive_msg_eu",
]);

/**
 * Confirm webhook readiness only after a supported, signed provider delivery
 * has successfully passed the webhook route's ingress handoff.
 *
 * updateMany + `webhookConfigured: false` keeps the operation idempotent and
 * avoids touching updatedAt on every later webhook after readiness is proven.
 */
export async function confirmTikTokWebhookReadiness(input: {
  tiktokAccountId: string;
  event: string;
}) {
  if (!CONFIRMING_TIKTOK_WEBHOOK_EVENTS.has(input.event)) {
    return { confirmed: false, changed: false };
  }

  const result = await prisma.tikTokAccount.updateMany({
    where: {
      id: input.tiktokAccountId,
      webhookConfigured: false,
    },
    data: { webhookConfigured: true },
  });

  return {
    confirmed: true,
    changed: result.count > 0,
  };
}
