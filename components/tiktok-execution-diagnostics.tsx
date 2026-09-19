type MatchDiagnostic = {
  id: string;
  automationId: string;
  automationName: string;
  eventType: string;
  providerEventId: string;
  matchedKeyword: string | null;
  status: string;
  plan: {
    trigger: "COMMENT" | "MESSAGE" | null;
    actionTypes: ("PUBLIC_REPLY" | "DM_REPLY")[];
    blocked: {
      type: "PUBLIC_REPLY" | "DM_REPLY";
      reason: "ACCOUNT_CAPABILITY_DISABLED" | "MESSAGE_MISSING";
    }[];
  };
  createdAt: string;
  updatedAt: string;
};

type OperationalDiagnostic = {
  id: string;
  level: string;
  message: string;
  payload: Record<string, string | number | boolean | null> | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type TikTokExecutionDiagnosticsData = {
  matches: MatchDiagnostic[];
  operationalEvents: OperationalDiagnostic[];
};

function statusClass(status: string) {
  if (status === "EXECUTED") return "bg-success/10 text-success";
  if (status === "FAILED") return "bg-error/10 text-error";
  if (status === "SKIPPED") return "bg-warning/10 text-warning";
  return "bg-surface-hover text-muted";
}

function levelClass(level: string) {
  if (level === "ERROR") return "text-error";
  if (level === "WARNING") return "text-warning";
  return "text-muted";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function actionLabel(match: MatchDiagnostic) {
  if (match.plan.actionTypes.length > 0) {
    return match.plan.actionTypes.join(", ");
  }
  if (match.plan.blocked.length > 0) {
    return `Blocked: ${match.plan.blocked
      .map((item) => `${item.type} (${item.reason})`)
      .join(", ")}`;
  }
  return "No executable action";
}

export default function TikTokExecutionDiagnostics({
  data,
}: {
  data: TikTokExecutionDiagnosticsData;
}) {
  return (
    <section className="panel rounded p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Routing & execution diagnostics</h2>
          <p className="mt-1 max-w-3xl text-xs text-muted">
            Sanitized staging evidence only. Comment/DM text, action-message text,
            actor identifiers, conversation IDs, provider tokens, and credentials
            are deliberately excluded from this view.
          </p>
        </div>
        <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          Live sends locked
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium">Recent durable matches</h3>
          <span className="text-xs text-muted">{data.matches.length} shown</span>
        </div>

        {data.matches.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No TikTok automation matches have been recorded yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-surface-hover text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Trigger</th>
                  <th className="px-3 py-2 font-medium">Action plan</th>
                  <th className="px-3 py-2 font-medium">Keyword</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((match) => (
                  <tr key={match.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">
                      {match.automationName}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {match.plan.trigger ?? match.eventType}
                    </td>
                    <td className="px-3 py-2 text-muted">{actionLabel(match)}</td>
                    <td className="px-3 py-2 text-muted">
                      {match.matchedKeyword ?? "Any text"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${statusClass(match.status)}`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {formatDate(match.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-medium">Recent TikTok worker diagnostics</h3>
          <span className="text-xs text-muted">
            {data.operationalEvents.length} shown
          </span>
        </div>

        {data.operationalEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No TikTok execution diagnostics have been recorded yet.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.operationalEvents.map((event) => (
              <article key={event.id} className="rounded border border-border p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <p className={`text-sm ${levelClass(event.level)}`}>
                    {event.message}
                  </p>
                  <span className="text-[11px] text-muted">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
                {event.payload && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(event.payload).map(([key, value]) => (
                      <code
                        key={key}
                        className="rounded bg-surface-hover px-2 py-1 text-[11px] text-muted"
                      >
                        {key}: {String(value)}
                      </code>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
