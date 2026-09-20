export type QuickAutomationTemplateId =
  | "comment-dm"
  | "follow-gate"
  | "tracked-link"
  | "link-follow-up";

export type QuickAutomationTemplate = {
  id: QuickAutomationTemplateId;
  title: string;
  description: string;
  badge: string;
  campaignName: string;
  keyword: string;
  publicReplyMessage: string;
  dmMessage: string;
  requireFollow: boolean;
  followPromptMessage: string;
  followPromptButtonLabel: string;
  trackedLinkRequired: boolean;
  followUpEnabled: boolean;
  followUpMessage: string;
  followUpDelayMinutes: number;
};

export const QUICK_AUTOMATION_TEMPLATES: QuickAutomationTemplate[] = [
  {
    id: "comment-dm",
    title: "Comment → DM",
    description: "When someone comments your keyword, send the promised details in a private message.",
    badge: "Fastest setup",
    campaignName: "Comment to DM",
    keyword: "GUIDE",
    publicReplyMessage: "Just sent it to your DMs 👋",
    dmMessage: "Thanks for commenting! Here are the details you asked for.",
    requireFollow: false,
    followPromptMessage: "",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: false,
    followUpEnabled: false,
    followUpMessage: "",
    followUpDelayMinutes: 0,
  },
  {
    id: "follow-gate",
    title: "Comment → Follow Gate → DM",
    description: "Ask the person to follow your account before revealing the promised message.",
    badge: "Grow followers",
    campaignName: "Follow Gate",
    keyword: "START",
    publicReplyMessage: "Check your DMs — I sent the next step 👋",
    dmMessage: "You're all set — here are the details you asked for.",
    requireFollow: true,
    followPromptMessage:
      "Follow this account, then tap the button below and I'll send it right away.",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: false,
    followUpEnabled: false,
    followUpMessage: "",
    followUpDelayMinutes: 0,
  },
  {
    id: "tracked-link",
    title: "Comment → Tracked Link",
    description: "Send a trackable link in DM and measure link clicks and CTR inside ReplyHalo.",
    badge: "Track CTR",
    campaignName: "Tracked Link",
    keyword: "LINK",
    publicReplyMessage: "The link is in your DMs 👋",
    dmMessage: "Here is the link you asked for: {link}",
    requireFollow: false,
    followPromptMessage: "",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: true,
    followUpEnabled: false,
    followUpMessage: "",
    followUpDelayMinutes: 0,
  },
  {
    id: "link-follow-up",
    title: "Comment → Link → Follow-up",
    description: "Send a tracked link, then automatically check in again within the supported messaging window.",
    badge: "Best for leads",
    campaignName: "Link and Follow-up",
    keyword: "INFO",
    publicReplyMessage: "Just sent the details to your DMs 👋",
    dmMessage: "Here are the details you asked for: {link}",
    requireFollow: false,
    followPromptMessage: "",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: true,
    followUpEnabled: true,
    followUpMessage:
      "Quick check-in — were you able to open the link? Reply here if you need help.",
    followUpDelayMinutes: 60,
  },
];

export function getQuickAutomationTemplate(id: string) {
  return QUICK_AUTOMATION_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function buildQuickAutomationPayload(input: {
  template: QuickAutomationTemplate;
  instagramAccountId: string;
  postId: string;
  postUrl?: string | null;
  campaignName: string;
  keyword: string;
  publicReplyMessage: string;
  dmMessage: string;
  trackedDestinationUrl?: string;
}) {
  const { template } = input;
  return {
    name: input.campaignName.trim(),
    instagramAccountId: input.instagramAccountId,
    postId: input.postId,
    postUrl: input.postUrl ?? null,
    pendingNextReel: false,
    matchAnyPost: false,
    keywords: [input.keyword.trim()],
    matchAnyWord: false,
    wholeWordMatch: true,
    dmTriggerEnabled: false,
    dmMessage: input.dmMessage.trim(),
    openingDmEnabled: false,
    openingDmMessage: null,
    openingDmButtonLabel: null,
    publicReplyEnabled: Boolean(input.publicReplyMessage.trim()),
    publicReplyMessage: input.publicReplyMessage.trim() || null,
    publicReplyMessages: input.publicReplyMessage.trim()
      ? [input.publicReplyMessage.trim()]
      : [],
    requireFollow: template.requireFollow,
    followPromptMessage: template.requireFollow
      ? template.followPromptMessage
      : null,
    followPromptButtonLabel: template.requireFollow
      ? template.followPromptButtonLabel
      : null,
    trackedDestinationUrl: template.trackedLinkRequired
      ? input.trackedDestinationUrl?.trim() ?? ""
      : "",
    linkButtonLabel: template.trackedLinkRequired ? "Open link" : null,
    followUpEnabled: template.followUpEnabled,
    followUpMessage: template.followUpEnabled ? template.followUpMessage : null,
    followUpDelayMinutes: template.followUpEnabled
      ? template.followUpDelayMinutes
      : 0,
    isActive: true,
  };
}
