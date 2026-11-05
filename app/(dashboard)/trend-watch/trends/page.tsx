import TrendWatchServiceState from "@/components/trend-watch-service-state";
import LocalizedText from "@/components/localized-text";
import TrendWatchRefreshTrendsButton from "@/components/trend-watch-refresh-trends-button";
import { isTrendWatchConfigured, trendWatchRequest } from "@/lib/trend-watch/server";
import { getCurrentWorkspaceContext } from "@/lib/workspace-access";

type Trend = {
  id: string | number;
  rank?: number | null;
  section?: string | null;
  section_title?: string | null;
  type?: string | null;
  keyword?: string | null;
  username?: string | null;
  media_count?: number | null;
  thumb?: string | null;
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
    const groups = new Map<string, Trend[]>();
    for (const item of items) {
      const key = item.section_title || item.section || "Instagram Trends";
      groups.set(key, [...(groups.get(key) || []), item]);
    }

    return (
      <div className="space-y-6 text-[#eceef3]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">
              <LocalizedText text="Instagram Trends" />
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#8b91a1]">
              Trending keywords, profiles and featured Reels collected from Instagram discovery surfaces.
            </p>
          </div>
          <TrendWatchRefreshTrendsButton />
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#343846] bg-[#12141a] p-12 text-center">
            <p className="text-sm text-[#8b91a1]">
              <LocalizedText text="Trend data has not been collected yet." />
            </p>
          </div>
        ) : (
          [...groups.entries()].map(([title, trends]) => (
            <section key={title} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold">{title}</h3>
                <span className="text-xs text-[#8b91a1]">{trends.length} items</span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {trends.map((trend) => (
                  <a
                    key={String(trend.id)}
                    href={trend.reel_link || "#"}
                    target={trend.reel_link ? "_blank" : undefined}
                    rel={trend.reel_link ? "noopener noreferrer" : undefined}
                    className="group overflow-hidden rounded-2xl border border-[#262a35] bg-[#171a22] transition hover:-translate-y-0.5 hover:border-[#3a4050]"
                  >
                    <div className="relative aspect-[4/5] bg-[#0f1116]">
                      {trend.thumb ? (
                        <img src={trend.thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl text-[#343846]">#</div>
                      )}
                      <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 font-mono text-xs font-bold text-white">
                        #{trend.rank ?? "—"}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-bold">
                        {trend.keyword || (trend.username ? "@" + trend.username : "Instagram Trend")}
                      </p>
                      <p className="mt-1 text-xs text-[#8b91a1]">
                        {trend.type || "trend"}
                        {trend.media_count ? " · " + trend.media_count.toLocaleString() : ""}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        )}
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
