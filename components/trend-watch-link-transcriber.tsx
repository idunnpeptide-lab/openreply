"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type Result = {
  item?: {
    id: string;
    platform: string;
    source_url: string;
    status: "queued" | "running" | "done" | "error";
    step?: string;
    error?: string | null;
    data?: {
      duration_seconds?: number;
      transcript?: {
        text?: string;
        language?: string;
        provider?: string;
        segments?: Array<{ start: number; end: number; text: string }>;
      };
    };
  };
};

export default function TrendWatchLinkTranscriber() {
  const { t } = useLocale();
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<Result["item"] | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/trend-watch/transcriptions/" + encodeURIComponent(jobId), { cache: "no-store" });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || "Could not load transcription");
        if (cancelled) return;
        const next = (json.data as Result).item;
        setJob(next || null);
        if (next?.status === "queued" || next?.status === "running") {
          timer = setTimeout(poll, 2500);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not check transcription status");
      }
    };
    void poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [jobId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !url.trim()) return;
    setError(""); setJob(null); setJobId(""); setCopied(false); setSubmitting(true);
    try {
      const response = await fetch("/api/trend-watch/transcriptions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = await response.json();
      if (!response.ok || !json.success || !json.data?.id) throw new Error(json.error || "Could not start transcription");
      setJobId(json.data.id as string);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start transcription");
    } finally {
      setSubmitting(false);
    }
  }

  const transcript = job?.data?.transcript;
  const busy = submitting || job?.status === "queued" || job?.status === "running";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5 sm:p-7">
        <h1 className="text-xl font-bold text-[#eceef3]">{t("Transcription by link")}</h1>
        <p className="mt-2 text-sm leading-6 text-[#9ca3b2]">
          {t("Paste a public Instagram Reel or TikTok video link. Trend Watch will transcribe the spoken audio with Whisper.")}
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-3">
          <label htmlFor="source-video-url" className="block text-sm font-medium text-[#eceef3]">
            {t("Instagram or TikTok video link")}
          </label>
          <input
            id="source-video-url"
            type="url" inputMode="url" autoComplete="url"
            required maxLength={2048}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.instagram.com/reel/...  |  https://www.tiktok.com/@creator/video/..."
            className="w-full rounded-xl border border-[#343846] bg-[#171a22] px-4 py-3 text-sm text-[#eceef3] placeholder:text-[#707685] focus:border-[#ff3d6e] focus:outline-none"
          />
          <button type="submit" disabled={Boolean(busy) || !url.trim()}
            className="rounded-xl bg-[#ff3d6e] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? t("Starting transcription…") : t("Transcribe video")}
          </button>
        </form>
        <p className="mt-3 text-xs text-[#8b91a1]">{t("Public videos only. Up to 10 minutes / 150 MB. Private, age-restricted or region-blocked videos may be unavailable.")}</p>
      </section>

      {(job || error) && (
        <section className="rounded-2xl border border-[#262a35] bg-[#12141a] p-5 sm:p-7" aria-live="polite">
          {error && <p role="alert" className="mb-3 text-sm text-[#ff8090]">{error}</p>}
          {job && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#eceef3]">{t("Transcription result")}</h2>
                <span className="rounded-lg border border-[#343846] px-3 py-1 text-xs text-[#c5cad5]">
                  {job.status === "done" ? t("Completed") : job.status === "error" ? t("Failed") : t("Processing…")}
                </span>
              </div>
              {job.status === "error" && <p role="alert" className="mt-3 text-sm text-[#ff8090]">{job.error || t("Could not transcribe this video.")}</p>}
              {(job.status === "queued" || job.status === "running") && <p className="mt-3 text-sm text-[#9ca3b2]">{t("Processing video and recognizing speech…")}</p>}
              {job.status === "done" && (
                <>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#9ca3b2]">
                    <span>{job.platform === "tiktok" ? "TikTok" : "Instagram"}</span>
                    {transcript?.language && <span>{t("Language")}: {transcript.language.toUpperCase()}</span>}
                    {job.data?.duration_seconds && <span>{t("Duration")}: {Math.round(job.data.duration_seconds)}s</span>}
                    {transcript?.provider && <span>Whisper: {transcript.provider}</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#eceef3]">{t("Voiceover transcript")}</span>
                    <button type="button" disabled={!transcript?.text}
                      onClick={async () => {
                        if (!transcript?.text) return;
                        try { await navigator.clipboard.writeText(transcript.text); setCopied(true); }
                        catch { setError(t("Clipboard unavailable. Select and copy the text manually.")); }
                      }}
                      className="rounded-xl border border-[#343846] px-3 py-2 text-sm text-[#eceef3] disabled:opacity-50">
                      {copied ? t("Copied!") : t("Copy text")}
                    </button>
                  </div>
                  <textarea readOnly rows={12} value={transcript?.text || ""}
                    className="mt-3 w-full rounded-xl border border-[#343846] bg-[#171a22] p-4 text-sm leading-6 text-[#eceef3]"
                    aria-label={t("Voiceover transcript")} />
                  {!transcript?.text && <p className="mt-2 text-sm text-[#9ca3b2]">{t("No speech was detected in this video.")}</p>}
                  {!!transcript?.segments?.length && (
                    <details className="mt-4 text-sm text-[#c5cad5]">
                      <summary className="cursor-pointer font-medium">{t("Show timestamped segments")}</summary>
                      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                        {transcript.segments.map((segment, index) => (
                          <div key={index} className="border-b border-[#262a35] pb-2">
                            <span className="mr-3 text-[#ff6688]">{Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, "0")}</span>
                            {segment.text}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
