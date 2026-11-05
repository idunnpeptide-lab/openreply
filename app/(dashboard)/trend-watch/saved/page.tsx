import TrendWatchServiceState from "@/components/trend-watch-service-state";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type SavedIdea = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  outlier?: number | null;
};

export default async function TrendWatchSavedPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const response = await trendWatchRequest<{ items: SavedIdea[] }>(
      context.workspaceId,
      "/v1/saved"
    );
    const items = response.items ?? [];

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Saved Ideas</h2>
          <p className="mt-1 text-sm text-muted">
            Winning formats you saved for later adaptation.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((idea) => (
            <article key={idea.code} className="panel rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  @{idea.username}
                </p>
                <span className="text-sm font-semibold text-accent">
                  {idea.outlier ? "×" + idea.outlier.toFixed(1) : "Saved"}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">
                {idea.caption || "No caption"}
              </p>
              {idea.link && (
                <a
                  href={idea.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-accent hover:underline"
                >
                  Open Reel
                </a>
              )}
            </article>
          ))}
          {items.length === 0 && (
            <div className="panel rounded p-10 text-center text-sm text-muted md:col-span-2">
              No saved ideas yet.
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Saved ideas are unavailable"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }
}
