"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type AnalysisItem = {
  code: string;
  status: "queued" | "running" | "done" | "error";
  step?: string | null;
  error?: string | null;
  data?: {
    meta?: {
      duration_seconds?: number | null;
      width?: number | null;
      height?: number | null;
    };
    sampling?: string | null;
    pacing?: {
      shot_count?: number | null;
      cuts_per_minute?: number | null;
      mean_shot_length?: number | null;
    };
    transcript?: {
      enabled?: boolean;
      text?: string | null;
      provider?: string | null;
    };
    ai_markdown?: string | null;
    frames?: unknown[];
    hook_frames?: unknown[];
  } | null;
};

async function readAnalysis(code: string) {
  const response = await fetch(
    "/api/trend-watch/analysis/" + encodeURIComponent(code),
    { cache: "no-store" }
  );
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error || "Could not load analysis");
  }
  return payload.data?.item as AnalysisItem | null;
}

export default function TrendWatchAnalyzer() {
  const searchParams = useSearchParams();
  const code = useMemo(() => searchParams.get("code")?.trim() || "", [searchParams]);
  const [item, setItem] = useState<AnalysisItem | null>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setItem(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const next = await readAnalysis(code);
        if (cancelled) return;
        setItem(next);
        setError(null);
        setLoading(false);
        if (next?.status === "queued" || next?.status === "running") {
          timer = setTimeout(poll, 2500);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load analysis");
        setLoading(false);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [code]);

  async function startAnalysis() {
    if (!code) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/trend-watch/analysis/" + encodeURIComponent(code),
        { method: "POST" }
      );
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || "Could not start analysis");
      }
      setItem({
        code,
        status: payload.data?.status === "running" ? "running" : "queued",
        step: "Queued",
      });
      window.setTimeout(async () => {
        try {
          setItem(await readAnalysis(code));
        } catch {
          // The normal polling effect will retry on the next page visit.
        }
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start analysis");
    } finally {
      setStarting(false);
    }
  }

  if (!code) {
    return (
      <div className="panel rounded p-8 text-center">
        <h2 className="text-base font-semibold text-foreground">Video Analyzer</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
          Open the Outliers tab and click Analyze on any Reel. Trend Watch will
          inspect scene changes, editing pace, the first 10 seconds, transcript
          and — when configured — generate an AI adaptation.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="panel h-48 rounded" />;
  }

  const data = item?.data;

  return (
    <div className="space-y-5">
      <div className="panel rounded p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Video Analyzer
            </h2>
            <p className="mt-1 text-sm text-muted">Reel code: {code}</p>
          </div>
          {(!item || item.status === "error") && (
            <button
              type="button"
              disabled={starting}
              onClick={startAnalysis}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {starting ? "Starting…" : item ? "Run again" : "Analyze video"}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        {item && item.status !== "done" && item.status !== "error" && (
          <div className="mt-5 rounded border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              {item.status === "queued" ? "Queued" : "Analyzing"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {item.step || "Processing video"}
            </p>
          </div>
        )}

        {item?.status === "error" && (
          <div className="mt-5 rounded border border-error/30 bg-background p-4">
            <p className="text-sm font-medium text-error">Analysis failed</p>
            <p className="mt-1 text-sm text-muted">
              {item.error || "Unknown analysis error"}
            </p>
          </div>
        )}
      </div>

      {item?.status === "done" && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="panel rounded p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Duration
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {data.meta?.duration_seconds
                  ? data.meta.duration_seconds.toFixed(1) + "s"
                  : "—"}
              </p>
            </div>
            <div className="panel rounded p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Shots
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {data.pacing?.shot_count ?? "—"}
              </p>
            </div>
            <div className="panel rounded p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Cuts / min
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {data.pacing?.cuts_per_minute ?? "—"}
              </p>
            </div>
            <div className="panel rounded p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Avg. shot
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {data.pacing?.mean_shot_length
                  ? data.pacing.mean_shot_length + "s"
                  : "—"}
              </p>
            </div>
          </div>

          <section className="panel rounded p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Transcript
              </h3>
              {data.transcript?.provider && (
                <span className="text-xs text-muted">
                  Whisper · {data.transcript.provider}
                </span>
              )}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">
              {data.transcript?.text ||
                "Whisper is not configured for this environment."}
            </p>
          </section>

          <section className="panel rounded p-5">
            <h3 className="text-sm font-semibold text-foreground">
              AI breakdown & adaptation
            </h3>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">
              {data.ai_markdown ||
                "Connect an Anthropic API key to generate the strategic breakdown, hooks and adapted script."}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
