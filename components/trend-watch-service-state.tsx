interface TrendWatchServiceStateProps {
  title?: string;
  description?: string;
}

export default function TrendWatchServiceState({
  title = "Trend Watch backend is being connected",
  description = "The ReplyHalo module is installed, but its isolated data-collection service is not configured in this environment yet.",
}: TrendWatchServiceStateProps) {
  return (
    <div className="panel rounded p-6">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {description}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            ReplyHalo
          </p>
          <p className="mt-1 text-sm text-success">UI ready</p>
        </div>
        <div className="rounded border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Workspace isolation
          </p>
          <p className="mt-1 text-sm text-success">Enabled</p>
        </div>
        <div className="rounded border border-border bg-background p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Collector
          </p>
          <p className="mt-1 text-sm text-warning">Service setup required</p>
        </div>
      </div>
    </div>
  );
}
