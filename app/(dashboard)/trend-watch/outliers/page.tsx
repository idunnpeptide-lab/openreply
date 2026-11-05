import TrendWatchServiceState from "@/components/trend-watch-service-state";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Outlier = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  thumb?: string | null;
  plays?: number | null;
  outlier?: number | null;
  velocity?: number | null;
  score?: number | null;
};

function compact(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export default async function TrendWatchOutliersPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  let items: Outlier[] = [];

  try {
    const response = await trendWatchRequest<{ items: Outlier[] }>(
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

      {items.length === 0 ? (
        <div className="panel rounded p-8 text-center text-sm text-muted">
          Add competitors and run a sync to discover outliers.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.code} className="panel overflow-hidden rounded">
              {item.thumb && (
                <img
                  src={item.thumb}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">
                    @{item.username}
                  </p>
                  <span className="rounded bg-background px-2 py-1 text-sm font-semibold text-accent">
                    {item.outlier ? "×" + item.outlier.toFixed(1) : "—"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {item.caption || "No caption"}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
                  <div>
                    <span className="block text-zinc-500">Views</span>
                    <span className="mt-1 block text-sm text-foreground">
                      {compact(item.plays)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">Velocity/h</span>
                    <span className="mt-1 block text-sm text-foreground">
                      {compact(item.velocity)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">Score</span>
                    <span className="mt-1 block text-sm text-foreground">
                      {item.score?.toFixed(0) ?? "—"}
                    </span>
                  </div>
                </div>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm text-accent hover:underline"
                  >
                    Open Reel
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
