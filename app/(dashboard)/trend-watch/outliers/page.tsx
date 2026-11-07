import TrendWatchOutlierGrid, { type TrendWatchOutlier } from "@/components/trend-watch-outlier-grid";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import { isTrendWatchConfigured, trendWatchRequest } from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Niche = { id: string | number; name: string };

export default async function TrendWatchOutliersPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const [outliers, niches] = await Promise.all([
      trendWatchRequest<{ items: TrendWatchOutlier[] }>(
        context.workspaceId,
        "/v1/outliers?period=all&min_outlier=0&sort=score"
      ),
      trendWatchRequest<{ items: Niche[] }>(context.workspaceId, "/v1/niches"),
    ]);

    return (
      <TrendWatchOutlierGrid
        initialItems={outliers.items ?? []}
        niches={niches.items ?? []}
      />
    );
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Trend Watch collector is temporarily unavailable"
        description={error instanceof Error ? error.message : "Could not load Trend Watch data."}
      />
    );
  }
}
