import TrendWatchOutlierGrid, {
  type TrendWatchOutlier,
} from "@/components/trend-watch-outlier-grid";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export default async function TrendWatchOutliersPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  let items: TrendWatchOutlier[] = [];

  try {
    const response = await trendWatchRequest<{ items: TrendWatchOutlier[] }>(
      context.workspaceId,
      "/v1/outliers?period=30d&min_outlier=3&sort=score"
    );
    items = response.items ?? [];
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Trend Watch collector is temporarily unavailable"
        description={
          error instanceof Error
            ? error.message
            : "Could not load outliers from the Trend Watch service."
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Outliers</h2>
          <p className="mt-1 text-sm text-muted">
            Reels performing at least 3× above the creator&apos;s normal baseline.
          </p>
        </div>
        <span className="text-sm text-muted">{items.length} found</span>
      </div>

      <TrendWatchOutlierGrid initialItems={items} />
    </div>
  );
}
