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
    description: "Send a private reply when someone comments your keyword.",
    badge: "Fastest setup",
    campaignName: "Comment to DM",
    keyword: "GUIDE",
    publicReplyMessage: "Sent you a message 👋",
    dmMessage: "Thanks for commenting — here are the details you asked for.",
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
    description: "Ask the person to follow before revealing the private message.",
    badge: "Grow followers",
    campaignName: "Follow Gate",
    keyword: "START",
    publicReplyMessage: "Check your DMs 👋",
    dmMessage: "Perfect — here are the details you asked for.",
    requireFollow: true,
    followPromptMessage:
      "Follow the account, then tap the button below and I'll send it right away.",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: false,
    followUpEnabled: false,
    followUpMessage: "",
    followUpDelayMinutes: 0,
  },
  {
    id: "tracked-link",
    title: "Comment → Tracked Link",
    description: "Deliver a trackable link and measure clicks and CTR in ReplyHalo.",
    badge: "Track CTR",
    campaignName: "Tracked Link",
    keyword: "LINK",
    publicReplyMessage: "I sent the link in DM 👋",
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
    description: "Send a tracked link, then follow up inside the supported messaging window.",
    badge: "Best for leads",
    campaignName: "Link and Follow-up",
    keyword: "INFO",
    publicReplyMessage: "Sent you the details 👋",
    dmMessage: "Here are the details you asked for: {link}",
    requireFollow: false,
    followPromptMessage: "",
    followPromptButtonLabel: "I'm following",
    trackedLinkRequired: true,
    followUpEnabled: true,
    followUpMessage:
      "Just checking — were you able to open the link? Reply here if you need help.",
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
