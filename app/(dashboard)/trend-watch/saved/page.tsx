import TrendWatchServiceState from "@/components/trend-watch-service-state";
import LocalizedText from "@/components/localized-text";
import TrendWatchSavedGrid, { type TrendWatchSavedIdea } from "@/components/trend-watch-saved-grid";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

export default async function TrendWatchSavedPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const response = await trendWatchRequest<{ items: TrendWatchSavedIdea[] }>(
      context.workspaceId,
      "/v1/saved"
    );
    const items = response.items ?? [];

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground"><LocalizedText text="Saved Ideas" /></h2>
          <p className="mt-1 text-sm text-muted">
            <LocalizedText text="Winning formats you saved for later adaptation." />
          </p>
        </div>
        <TrendWatchSavedGrid initialItems={items} />
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
