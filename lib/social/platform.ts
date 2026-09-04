export const SOCIAL_PLATFORMS = ["INSTAGRAM", "TIKTOK"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialAccountIdentity = {
  platform: SocialPlatform;
  accountId: string;
  username?: string | null;
};

export type SocialCommentEvent = {
  platform: SocialPlatform;
  accountId: string;
  contentId: string;
  commentId: string;
  authorId: string;
  authorUsername?: string | null;
  text: string;
};

export type CommentKeywordTrigger = {
  type: "COMMENT_KEYWORD";
  keywords: string[];
};

export type SocialAutomationAction =
  | { type: "PUBLIC_REPLY"; message: string }
  | { type: "DM"; message: string }
  | { type: "SEND_LINK"; url: string; message?: string };
