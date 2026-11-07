"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

type Status = {
  accounts?: number;
  reels?: number;
  niches?: number;
  outliers?: number;
};

export default function TrendWatchHeader() {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>({});
  const [syncing, setSyncing] = useState(false);
  const [scraperOk, setScraperOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshStatus() {
    try {
      const response = await fetch("/api/trend-watch/status", { cache: "no-store" });
      const payload = await response.json();
      if (payload.success) {
        setStatus(payload.data?.items ?? {});
        setSyncing(Boolean(payload.data?.sync_running));
        setScraperOk(true);
      } else {
        setScraperOk(false);
      }
    } catch {
      setScraperOk(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
    const timer = setInterval(refreshStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  async function syncAll() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/trend-watch/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: null }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error || "Sync failed");
      setSyncing(Boolean(payload.data?.started) || syncing);
      setMessage(payload.data?.started ? t("Sync started") : t("Sync is already running"));
      await refreshStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Sync failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#262a35] bg-[#12141a] p-4 text-[#eceef3]">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl text-[#ff3d6e]">◉</span>
            <h1 className="text-xl font-extrabold tracking-tight">Trend Watch</h1>
            <span className="rounded-md bg-[#ff3d6e] px-2 py-0.5 text-[11px] font-bold text-white">REELS</span>
          </div>
          <p className="mt-1 text-sm text-[#8b91a1]">
            {t("Track competitors, surface outlier Reels, monitor Instagram trends, save ideas and break down winning videos into hooks, pacing and reusable content structures.")}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className={"rounded-full border px-2.5 py-1 text-xs " + (scraperOk ? "border-[#1f5a44] text-[#2ee59d]" : "border-[#5a1f2e] text-[#ff3d6e]")}>
            {scraperOk === null ? "Collector…" : scraperOk ? "Collector OK" : "Collector error"}
          </span>
          <span className="rounded-full border border-[#262a35] px-2.5 py-1 text-xs text-[#8b91a1]">
            {status.accounts ?? 0} {t("accounts")}
          </span>
          <span className="rounded-full border border-[#262a35] px-2.5 py-1 text-xs text-[#8b91a1]">
            {status.reels ?? 0} Reels
          </span>
          <span className="rounded-full border border-[#262a35] px-2.5 py-1 text-xs text-[#8b91a1]">
            {status.outliers ?? 0} Outliers
          </span>
          <button
            type="button"
            onClick={syncAll}
            disabled={busy || syncing}
            className="rounded-xl bg-[#ff3d6e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy || syncing ? "↻ " + t("Syncing…") : "↻ " + t("Update all")}
          </button>
        </div>
      </div>
      {message && <p className="mt-3 text-xs text-[#8b91a1]">{message}</p>}
    </div>
  );
}
