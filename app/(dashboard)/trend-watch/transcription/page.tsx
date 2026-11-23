import TrendWatchLinkTranscriber from "@/components/trend-watch-link-transcriber";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import { isTrendWatchConfigured } from "@/lib/trend-watch/server";

export default function TrendWatchTranscriptionPage() {
  if (!isTrendWatchConfigured()) {
    return <TrendWatchServiceState description="Connect Trend Watch backend to transcribe video links." />;
  }
  return <TrendWatchLinkTranscriber />;
}
