import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/client";

export type SocialEventReceiptInput = {
  workspaceId: string;
  platform: "INSTAGRAM" | "TIKTOK";
  providerAccountId: string;
  eventType: string;
  providerEventId: string;
  webhookEventId: string;
  operationalMessage: string;
  normalizedPayload: Record<string, unknown>;
};

export type SocialEventReceiptResult = "CREATED" | "DUPLICATE";

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  // Provider-normalized events are plain data objects. Round-tripping removes
  // optional `undefined` properties, which Prisma JSON does not accept, while
  // preserving strings used for provider-native IDs exactly.
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

/**
 * Persist a provider-neutral handoff exactly once per logical provider event.
 *
 * Webhook deliveries are only transport envelopes and can be re-signed or
 * redelivered. The durable uniqueness key therefore uses the provider-native
 * comment/message id rather than the webhook receipt id.
 */
export async function persistSocialEventHandoff(
  input: SocialEventReceiptInput
): Promise<SocialEventReceiptResult> {
  const normalized = toJsonObject(input.normalizedPayload);

  try {
    await prisma.$transaction([
      prisma.socialEventReceipt.create({
        data: {
          workspaceId: input.workspaceId,
          platform: input.platform,
          providerAccountId: input.providerAccountId,
          eventType: input.eventType,
          providerEventId: input.providerEventId,
          webhookEventId: input.webhookEventId,
        },
      }),
      prisma.operationalEvent.create({
        data: {
          workspaceId: input.workspaceId,
          source: "WORKER",
          level: "INFO",
          message: input.operationalMessage,
          payload: {
            webhookEventId: input.webhookEventId,
            ...normalized,
          },
        },
      }),
      prisma.webhookEvent.update({
        where: { id: input.webhookEventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      }),
    ]);

    return "CREATED";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // The logical provider event already crossed the ReplyHalo boundary.
      // Mark this delivery processed without emitting another handoff.
      await prisma.webhookEvent.update({
        where: { id: input.webhookEventId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });
      return "DUPLICATE";
    }
    throw error;
  }
}
