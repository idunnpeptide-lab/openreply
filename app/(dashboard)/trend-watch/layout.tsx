import TrendWatchSubnav from "@/components/trend-watch-subnav";

export default function TrendWatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Trend Watch</h1>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
            Content intelligence
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Track competitors, surface outlier Reels, monitor Instagram trends,
          save ideas and break down winning videos into hooks, pacing and
          reusable content structures.
        </p>
      </div>

      <TrendWatchSubnav />
      {children}
    </div>
  );
}
