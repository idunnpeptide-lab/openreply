import TrendWatchAnalyzer from "@/components/trend-watch-analyzer";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import { isTrendWatchConfigured } from "@/lib/trend-watch/server";

export default function TrendWatchAnalyzerPage() {
  if (!isTrendWatchConfigured()) {
    return (
      <TrendWatchServiceState
        description="The analyzer UI is installed. The separate ffmpeg / Whisper worker must be connected before videos can be processed."
      />
    );
  }

  return <TrendWatchAnalyzer />;
}
