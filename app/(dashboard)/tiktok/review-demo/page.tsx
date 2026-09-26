import { notFound } from "next/navigation";
import TikTokReviewDemo from "@/components/tiktok-review-demo";
import { isTikTokReviewDemoAvailable } from "@/lib/tiktok/review-demo";

export const dynamic = "force-dynamic";

export default function TikTokReviewDemoPage() {
  if (!isTikTokReviewDemoAvailable()) {
    notFound();
  }

  return <TikTokReviewDemo />;
}
