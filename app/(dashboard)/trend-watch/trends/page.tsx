import TrendWatchServiceState from "@/components/trend-watch-service-state";
import TrendWatchRefreshTrendsButton from "@/components/trend-watch-refresh-trends-button";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Trend = {
  id: string | number;
  rank?: number | null;
  section_title?: string | null;
  keyword?: string | null;
  username?: string | null;
  reel_link?: string | null;
};

export default async function TrendWatchTrendsPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const response = await trendWatchRequest<{ items: Trend[] }>(
      context.workspaceId,
      "/v1/trends"
    );
    const items = response.items ?? [];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Instagram Trends
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Trending topics, profiles and featured Reels discovered by the
              isolated Instagram collector.
            </p>
          </div>
          <TrendWatchRefreshTrendsButton />
        </div>
        <div className="panel rounded divide-y divide-border">
          {items.map((trend) => (
            <div
              key={String(trend.id)}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 text-sm font-semibold text-muted">
                  #{trend.rank ?? "—"}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {trend.keyword || trend.username || "Trend"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {trend.section_title || "Instagram"}
                    {trend.username ? " · @" + trend.username : ""}
                  </p>
                </div>
              </div>
              {trend.reel_link && (
                <a
                  href={trend.reel_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  Open
                </a>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="p-10 text-center text-sm text-muted">
              Trend data has not been collected yet.
            </p>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Instagram trend data is unavailable"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }
}
