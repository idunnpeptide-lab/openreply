import TrendWatchCompetitorManager from "@/components/trend-watch-competitor-manager";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import {
  isTrendWatchConfigured,
  trendWatchRequest,
} from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Niche = { id: string | number; name: string; accounts?: number };
type Account = {
  username: string;
  followers?: number | null;
  niche?: string | null;
  best_outlier?: number | null;
  status?: string | null;
  error?: string | null;
};

export default async function TrendWatchCompetitorsPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return (
      <TrendWatchServiceState
        description="The competitors workspace is installed in ReplyHalo. The isolated collector service still needs its Railway configuration before accounts can be added."
      />
    );
  }

  try {
    const [niches, accounts] = await Promise.all([
      trendWatchRequest<{ items: Niche[] }>(context.workspaceId, "/v1/niches"),
      trendWatchRequest<{ items: Account[] }>(
        context.workspaceId,
        "/v1/accounts"
      ),
    ]);

    return (
      <TrendWatchCompetitorManager
        initialNiches={niches.items ?? []}
        initialAccounts={accounts.items ?? []}
      />
    );
  } catch (error) {
    return (
      <TrendWatchCompetitorManager
        initialNiches={[]}
        initialAccounts={[]}
        initialError={error instanceof Error ? error.message : "Trend Watch collector is unavailable"}
      />
    );
  }
}
