import TrendWatchOutlierGrid, { type TrendWatchOutlier } from "@/components/trend-watch-outlier-grid";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import { isTrendWatchConfigured, trendWatchRequest } from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Niche = { id: string | number; name: string };
type TrackedAccount = { username: string };
type OutliersResponse = { items: TrendWatchOutlier[]; total: number };

export default async function TrendWatchOutliersPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account = "" } = await searchParams;
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const [outliers, niches, accounts] = await Promise.all([
      trendWatchRequest<OutliersResponse>(
        context.workspaceId,
        "/v1/outliers?period=all&min_outlier=0&sort=plays&limit=60&username=" +
          encodeURIComponent(account)
      ),
      trendWatchRequest<{ items: Niche[] }>(context.workspaceId, "/v1/niches"),
      trendWatchRequest<{ items: TrackedAccount[] }>(context.workspaceId, "/v1/accounts"),
    ]);

    return (
      <TrendWatchOutlierGrid
        initialItems={outliers.items ?? []}
        initialTotal={outliers.total ?? 0}
        initialAccount={account}
        accounts={(accounts.items ?? []).map((item) => item.username)}
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
