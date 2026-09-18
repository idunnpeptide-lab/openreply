export const SOCIAL_PLATFORMS = ["INSTAGRAM", "TIKTOK"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/**
 * Provider-neutral comment event used at the boundary between a social network
 * adapter and ReplyHalo automation logic. IDs remain provider-native strings;
 * accountId is the platform identity used by the provider (Instagram account
 * ID or TikTok open_id/business_id), not our database row id.
 */
export type SocialCommentEvent = {
  platform: SocialPlatform;
  accountId: string;
  contentId: string;
  commentId: string;
  authorId: string;
  authorUsername?: string | null;
  text: string;
  createdAt?: string | null;
};

/**
 * Provider-neutral inbound direct-message event. conversationId remains the
 * provider-native conversation target required when replying.
 */
export type SocialMessageEvent = {
  platform: SocialPlatform;
  accountId: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  senderUsername?: string | null;
  text: string;
  isFollower?: boolean | null;
  createdAt?: string | null;
};

export type ProviderCapabilityAvailability =
  | "SUPPORTED"
  | "ACCOUNT_DEPENDENT"
  | "UNSUPPORTED";

export type SocialProviderCapabilities = {
  comments: ProviderCapabilityAvailability;
  publicReply: ProviderCapabilityAvailability;
  directMessage: ProviderCapabilityAvailability;
  commentToMessage: ProviderCapabilityAvailability;
  webhooks: ProviderCapabilityAvailability;
};

/**
 * Capabilities exposed by the official platform APIs, not the current
 * ReplyHalo implementation status. ACCOUNT_DEPENDENT means the provider can
 * expose the capability but the connected account/app must be eligible and
 * approved for it.
 */
export const SOCIAL_PROVIDER_CAPABILITIES: Record<
  SocialPlatform,
  SocialProviderCapabilities
> = {
  INSTAGRAM: {
    comments: "SUPPORTED",
    publicReply: "SUPPORTED",
    directMessage: "SUPPORTED",
    commentToMessage: "SUPPORTED",
    webhooks: "SUPPORTED",
  },
  TIKTOK: {
    comments: "SUPPORTED",
    publicReply: "SUPPORTED",
    directMessage: "ACCOUNT_DEPENDENT",
    commentToMessage: "ACCOUNT_DEPENDENT",
    webhooks: "SUPPORTED",
  },
};

export type ProviderImplementationStage =
  | "LIVE"
  | "FOUNDATION"
  | "NOT_STARTED";

export const REPLYHALO_PROVIDER_STAGE: Record<
  SocialPlatform,
  ProviderImplementationStage
> = {
  INSTAGRAM: "LIVE",
  TIKTOK: "FOUNDATION",
};
