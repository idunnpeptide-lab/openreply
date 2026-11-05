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

  return (
    <div className="panel rounded p-6">
      <h2 className="text-base font-semibold text-foreground">Video Analyzer</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        Open an outlier Reel and send it here for scene-change frames, pacing,
        the first-10-second hook microscope, transcript and AI adaptation.
      </p>
      <div className="mt-6 rounded border border-dashed border-border bg-background p-8 text-center">
        <p className="text-sm text-muted">
          Analysis actions become available after the Trend Watch worker is
          deployed.
        </p>
      </div>
    </div>
  );
}
