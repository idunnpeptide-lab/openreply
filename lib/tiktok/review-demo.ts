export const TIKTOK_REVIEW_DEMO_PATH = "/tiktok/review-demo";

export type RuntimeEnv = Record<string, string | undefined>;

export function isTikTokReviewDemoAvailable(
  env: RuntimeEnv = process.env
): boolean {
  if (env.NODE_ENV !== "production") return true;
  return env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase() === "staging";
}

export const TIKTOK_REVIEW_DEMO_ACCOUNT = {
  username: "replyhalo_demo",
  displayName: "ReplyHalo Demo Brand",
} as const;

export const TIKTOK_REVIEW_DEMO_VIDEOS = [
  {
    id: "demo-video-1",
    title: "Product tutorial — 15 sec",
    views: 12840,
    comments: 187,
    likes: 934,
  },
  {
    id: "demo-video-2",
    title: "Creator demo — 22 sec",
    views: 8210,
    comments: 96,
    likes: 611,
  },
  {
    id: "demo-video-3",
    title: "Feature walkthrough — 18 sec",
    views: 5240,
    comments: 64,
    likes: 402,
  },
] as const;

export const TIKTOK_REVIEW_DEMO_NOTICE =
  "Review prototype only. This page uses local demo data and never calls TikTok APIs or sends comments, messages, or posts.";
