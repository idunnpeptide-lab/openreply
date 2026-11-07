"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

type Frame = {
  file?: string;
  timestamp_seconds?: number | null;
  source?: string | null;
};

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
    frames?: Frame[];
    hook_frames?: Frame[];
  } | null;
};

async function readAnalysis(code: string) {
  const response = await fetch(
    "/api/trend-watch/analysis/" + encodeURIComponent(code),
    { cache: "no-store" }
  );
  const payload = await response.json();
  if (!payload.success) throw new Error(payload.error || "Could not load analysis");
  return payload.data?.item as AnalysisItem | null;
}

function frameUrl(code: string, kind: "frames" | "hook", file?: string) {
  if (!file) return "";
  return (
    "/api/trend-watch-assets/" +
    encodeURIComponent(code) +
    "/" +
    kind +
    "/" +
    encodeURIComponent(file)
  );
}

function fmtTime(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(value < 10 ? 1 : 0) + "s";
}

export default function TrendWatchAnalyzer() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const code = useMemo(() => searchParams.get("code")?.trim() || "", [searchParams]);
  const [item, setItem] = useState<AnalysisItem | null>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollKey, setPollKey] = useState(0);

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
  }, [code, pollKey]);

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
      if (!payload.success) throw new Error(payload.error || "Could not start analysis");
      setItem({
        code,
        status: payload.data?.status === "running" ? "running" : "queued",
        step: "Queued",
      });
      setPollKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start analysis");
    } finally {
      setStarting(false);
    }
  }

  if (!code) {
    return (
      <div className="rounded-2xl border border-[#262a35] bg-[#12141a] p-10 text-center text-[#eceef3]">
        <h2 className="text-lg font-bold">{t("Video Analyzer")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#8b91a1]">
          {t("Open the Outliers tab and click Analyze on any Reel. Trend Watch will inspect scene changes, editing pace, the first 10 seconds, transcript and — when configured — generate an AI adaptation.")}
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="h-48 rounded-2xl border border-[#262a35] bg-[#12141a]" />;
  }

  const data = item?.data;
  const frames = data?.frames ?? [];
  const hookFrames = data?.hook_frames ?? [];

  return (
    <div className="space-y-5 text-[#eceef3]">
      <div className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{t("Video Analyzer")}</h2>
            <p className="mt-1 text-sm text-[#8b91a1]">{t("Reel code")}: {code}</p>
          </div>
          {(!item || item.status === "error") && (
            <button
              type="button"
              disabled={starting}
              onClick={startAnalysis}
              className="rounded-xl bg-[#ff3d6e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {starting ? t("Starting…") : item ? t("Run again") : t("Analyze video")}
            </button>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-[#ff3d6e]">{error}</p>}

        {item && item.status !== "done" && item.status !== "error" && (
          <div className="mt-5 overflow-hidden rounded-xl border border-[#262a35] bg-[#171a22]">
            <div className="h-1 bg-[#262a35]">
              <div className="h-full w-2/3 animate-pulse bg-[#ff3d6e]" />
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold">
                {item.status === "queued" ? t("Queued") : t("Analyzing")}
              </p>
              <p className="mt-1 text-sm text-[#8b91a1]">
                {item.step ? t(item.step) : t("Processing video")}
              </p>
            </div>
          </div>
        )}

        {item?.status === "error" && (
          <div className="mt-5 rounded-xl border border-[#5a1f2e] bg-[#171a22] p-4">
            <p className="text-sm font-semibold text-[#ff3d6e]">{t("Analysis failed")}</p>
            <p className="mt-1 text-sm text-[#8b91a1]">
              {item.error || t("Unknown analysis error")}
            </p>
          </div>
        )}
      </div>

      {item?.status === "done" && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Duration", data.meta?.duration_seconds ? data.meta.duration_seconds.toFixed(1) + "s" : "—"],
              ["Shots", data.pacing?.shot_count ?? "—"],
              ["Cuts / min", data.pacing?.cuts_per_minute ?? "—"],
              ["Avg. shot", data.pacing?.mean_shot_length ? data.pacing.mean_shot_length + "s" : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#262a35] bg-[#171a22] p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#8b91a1]">{label}</p>
                <p className="mt-2 font-mono text-xl font-bold">{String(value)}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
            <div>
              <h3 className="text-base font-bold">{t("Hook microscope")}</h3>
              <p className="mt-1 text-sm text-[#8b91a1]">
                {t("Dense sampling of the first 10 seconds to inspect the hook frame by frame.")}
              </p>
            </div>
            {hookFrames.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {hookFrames.map((frame, index) => (
                  <figure key={frame.file || index} className="w-28 shrink-0">
                    <img
                      src={frameUrl(code, "hook", frame.file)}
                      alt=""
                      className="aspect-[9/16] w-full rounded-xl border border-[#262a35] object-cover"
                    />
                    <figcaption className="mt-1 text-center font-mono text-[10px] text-[#8b91a1]">
                      {fmtTime(frame.timestamp_seconds)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#8b91a1]">{t("No hook frames available.")}</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
            <div>
              <h3 className="text-base font-bold">{t("Scene changes & pacing")}</h3>
              <p className="mt-1 text-sm text-[#8b91a1]">
                {t("Frames captured on edit cuts or sampled uniformly when scene detection is sparse.")}
              </p>
            </div>
            {frames.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {frames.map((frame, index) => (
                  <figure key={frame.file || index} className="w-32 shrink-0">
                    <img
                      src={frameUrl(code, "frames", frame.file)}
                      alt=""
                      className="aspect-[9/16] w-full rounded-xl border border-[#262a35] object-cover"
                    />
                    <figcaption className="mt-1 text-center font-mono text-[10px] text-[#8b91a1]">
                      {fmtTime(frame.timestamp_seconds)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#8b91a1]">{t("No scene frames available.")}</p>
            )}
          </section>

          <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold">{t("Transcript")}</h3>
              {data.transcript?.provider && (
                <span className="rounded-full border border-[#262a35] px-2.5 py-1 text-xs text-[#8b91a1]">
                  Whisper · {data.transcript.provider}
                </span>
              )}
            </div>
            <div className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-[#171a22] p-4 font-mono text-xs leading-6 text-[#c9cdd6]">
              {data.transcript?.text || t("Whisper is not configured for this environment.")}
            </div>
          </section>

          <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5">
            <h3 className="text-base font-bold">{t("AI breakdown & adaptation")}</h3>
            <div className="mt-4 whitespace-pre-wrap rounded-xl bg-[#171a22] p-4 text-sm leading-6 text-[#c9cdd6]">
              {data.ai_markdown ||
                t("Connect an Anthropic API key to generate the strategic breakdown, hooks and adapted script.")}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
