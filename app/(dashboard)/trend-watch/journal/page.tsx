import { isTrendWatchConfigured, trendWatchRequest } from "@/lib/trend-watch/server";
import TrendWatchServiceState from "@/components/trend-watch-service-state";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type EventItem = {
  id: string | number;
  ts?: string | null;
  level?: string | null;
  message?: string | null;
};

export default async function TrendWatchJournalPage() {
  const context = await getCurrentWorkspaceContext();

  if (!context || !isTrendWatchConfigured()) {
    return <TrendWatchServiceState />;
  }

  try {
    const response = await trendWatchRequest<{ items: EventItem[] }>(
      context.workspaceId,
      "/v1/events"
    );
    const items = response.items ?? [];

    return (
      <div className="rounded-2xl border border-[#262a35] bg-[#12141a] p-4 text-[#eceef3]">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Journal</h2>
          <p className="mt-1 text-sm text-[#8b91a1]">
            Sync, scraper and analysis events for this workspace.
          </p>
        </div>
        <div className="rounded-xl border border-[#262a35] bg-[#0f1116] p-3 font-mono text-xs leading-6">
          {items.length === 0 ? (
            <p className="text-[#8b91a1]">No events yet.</p>
          ) : (
            items.map((item) => (
              <div key={String(item.id)} className="grid gap-2 border-b border-[#1d2029] py-2 last:border-0 md:grid-cols-[190px_70px_1fr]">
                <span className="text-[#666d7c]">
                  {item.ts ? new Date(item.ts).toLocaleString() : "—"}
                </span>
                <span className={
                  item.level === "error"
                    ? "text-[#ff3d6e]"
                    : item.level === "warning"
                      ? "text-[#ffb020]"
                      : "text-[#2ee59d]"
                }>
                  {(item.level || "info").toUpperCase()}
                </span>
                <span className="text-[#c9cdd6]">{item.message || "—"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <TrendWatchServiceState
        title="Trend Watch journal is unavailable"
        description={error instanceof Error ? error.message : undefined}
      />
    );
  }
}
