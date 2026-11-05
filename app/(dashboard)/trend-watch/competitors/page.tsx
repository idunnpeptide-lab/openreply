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
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="panel rounded p-4">
          <h2 className="text-sm font-semibold text-foreground">Niches</h2>
          <div className="mt-3 space-y-2">
            {(niches.items ?? []).map((niche) => (
              <div
                key={String(niche.id)}
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
              >
                <span className="text-sm text-foreground">{niche.name}</span>
                <span className="text-xs text-muted">{niche.accounts ?? 0}</span>
              </div>
            ))}
            {(niches.items ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                No niches yet.
              </p>
            )}
          </div>
        </section>

        <section className="panel rounded p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Competitors
              </h2>
              <p className="mt-1 text-sm text-muted">
                Tracked Instagram accounts and their strongest recent outlier.
              </p>
            </div>
            <span className="text-sm text-muted">
              {(accounts.items ?? []).length} accounts
            </span>
          </div>

          <div className="mt-4 divide-y divide-border">
            {(accounts.items ?? []).map((account) => (
              <div
                key={account.username}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    @{account.username}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {account.niche || "Unassigned"} ·{" "}
                    {account.followers?.toLocaleString() ?? "—"} followers
                  </p>
                </div>
                <span className="text-sm font-medium text-accent">
                  {account.best_outlier
                    ? "best ×" + account.best_outlier.toFixed(1)
                    : "Collecting"}
                </span>
              </div>
            ))}
            {(accounts.items ?? []).length === 0 && (
              <p className="py-10 text-center text-sm text-muted">
                Add your first competitor to start monitoring.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Competitor data is unavailable"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }
}
