"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

export type TrendWatchOutlier = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  thumb?: string | null;
  image?: string | null;
  plays?: number | null;
  likes?: number | null;
  comments?: number | null;
  outlier?: number | null;
  velocity?: number | null;
  score?: number | null;
  er?: number | null;
  virality?: number | null;
  published_at?: string | null;
  saved?: boolean | null;
  audio_title?: string | null;
  niche_id?: string | number | null;
  niche?: string | null;
  analysis?: string | null;
};

type Niche = { id: string | number; name: string };

function compact(value: number | null | undefined, locale: "en" | "uk") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function fmtPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return (value * 100).toFixed(value < 0.01 ? 2 : 1) + "%";
}

function periodCutoff(period: string) {
  const map: Record<string, number | null> = {
    "1d": 1,
    "3d": 3,
    "7d": 7,
    "30d": 30,
    "90d": 90,
    all: null,
  };
  const days = map[period];
  if (!days) return null;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export default function TrendWatchOutlierGrid({
  initialItems,
  niches,
}: {
  initialItems: TrendWatchOutlier[];
  niches: Niche[];
}) {
  const { locale, t } = useLocale();
  const [items, setItems] = useState(initialItems);
  const [period, setPeriod] = useState("30d");
  const [minOutlier, setMinOutlier] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "outlier" | "velocity" | "plays" | "er" | "new">("score");
  const [query, setQuery] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrendWatchOutlier | null>(null);
  const [limit, setLimit] = useState(36);

  const visible = useMemo(() => {
    const cutoff = periodCutoff(period);
    const q = query.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        if ((item.outlier ?? 0) < minOutlier) return false;
        if (nicheId && String(item.niche_id ?? "") !== nicheId) return false;
        if (cutoff && item.published_at) {
          const ts = new Date(item.published_at).getTime();
          if (!Number.isNaN(ts) && ts < cutoff) return false;
        }
        if (q) {
          const haystack = [
            item.caption,
            item.username,
            item.audio_title,
            item.niche,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "new") {
          return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
        }
        return Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0);
      });
  }, [items, minOutlier, nicheId, period, query, sortBy]);

  async function toggleSaved(item: TrendWatchOutlier) {
    setBusyCode(item.code);
    try {
      const response = await fetch(
        "/api/trend-watch/reels/" + encodeURIComponent(item.code) + "/saved",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: !item.saved }),
        }
      );
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error || "Could not update saved state");
      const next = { ...item, saved: !item.saved };
      setItems((current) => current.map((row) => (row.code === item.code ? next : row)));
      setSelected((current) => (current?.code === item.code ? next : current));
    } finally {
      setBusyCode(null);
    }
  }

  const periodOptions = ["1d", "3d", "7d", "30d", "90d", "all"];
  const outlierOptions = [0, 2, 3, 5, 10];

  return (
    <div className="space-y-4 text-[#eceef3]">
      <div className="rounded-2xl border border-[#262a35] bg-[#12141a] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={nicheId}
            onChange={(e) => setNicheId(e.target.value)}
            className="rounded-xl border border-[#262a35] bg-[#171a22] px-3 py-2 text-sm text-[#eceef3]"
          >
            <option value="">{t("All niches")}</option>
            {niches.map((niche) => (
              <option key={String(niche.id)} value={String(niche.id)}>
                {niche.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl border border-[#262a35] bg-[#171a22] p-1">
            {periodOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold " +
                  (period === value ? "bg-[#262a35] text-white" : "text-[#8b91a1]")
                }
              >
                {value === "1d" ? "24h" : value === "3d" ? "3d" : value === "7d" ? "7d" : value === "30d" ? "30d" : value === "90d" ? "90d" : t("All")}
              </button>
            ))}
          </div>

          <div className="flex rounded-xl border border-[#262a35] bg-[#171a22] p-1">
            {outlierOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMinOutlier(value)}
                className={
                  "rounded-lg px-2.5 py-1.5 text-xs font-semibold " +
                  (minOutlier === value ? "bg-[#262a35] text-white" : "text-[#8b91a1]")
                }
              >
                {value === 0 ? t("Any") : "×" + value + "+"}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-[#262a35] bg-[#171a22] px-3 py-2 text-sm text-[#eceef3]"
          >
            <option value="score">Trend Score</option>
            <option value="outlier">Outlier ×</option>
            <option value="velocity">{t("Velocity")}</option>
            <option value="plays">{t("Views")}</option>
            <option value="er">ER</option>
            <option value="new">{t("Newest")}</option>
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search caption, author, audio…")}
            className="min-w-[220px] flex-1 rounded-xl border border-[#262a35] bg-[#171a22] px-3 py-2 text-sm text-[#eceef3] placeholder:text-[#666d7c]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-[#8b91a1]">
        <span>{visible.length} {t("Reels found")}</span>
        <span>{t("Click a Reel to open full details")}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#343846] bg-[#12141a] px-6 py-16 text-center">
          <p className="text-base font-semibold text-[#eceef3]">{t("No Trend Watch data yet")}</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#8b91a1]">
            {t("Create a niche, add Instagram competitors, then run Update all. Trend Watch will collect Reels and surface outliers automatically.")}
          </p>
          <Link
            href="/trend-watch/competitors"
            className="mt-5 inline-flex rounded-xl bg-[#ff3d6e] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("Add competitors")}
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#343846] bg-[#12141a] px-6 py-16 text-center text-sm text-[#8b91a1]">
          {t("No Reels match these filters.")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.slice(0, limit).map((item) => (
              <article
                key={item.code}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-[#262a35] bg-[#171a22] transition hover:-translate-y-0.5 hover:border-[#3a4050]"
                onClick={() => setSelected(item)}
              >
                <div className="relative aspect-[9/14] bg-[#0f1116]">
                  {item.thumb ? (
                    <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#666d7c]">No preview</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 to-transparent" />
                  <span className={
                    "absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 font-mono text-sm font-bold " +
                    ((item.outlier ?? 0) >= 10 ? "text-[#ff3d6e]" : (item.outlier ?? 0) >= 5 ? "text-[#ffb020]" : "text-white")
                  }>
                    {item.outlier ? "×" + item.outlier.toFixed(1) : "×—"}
                  </span>
                  {item.analysis === "done" && (
                    <span className="absolute left-2 top-11 rounded-md bg-[#2ee59d] px-2 py-0.5 text-[10px] font-bold text-[#04130c]">
                      {t("ANALYZED")}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busyCode === item.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleSaved(item);
                    }}
                    className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-black/60 text-base text-white"
                  >
                    {item.saved ? "★" : "☆"}
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-semibold text-white">
                    <span>{compact(item.plays, locale)} ▶</span>
                    <span>{item.score?.toFixed(0) ?? "—"} score</span>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">@{item.username}</span>
                    <span className="shrink-0 text-[11px] text-[#8b91a1]">{item.niche || ""}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-[#8b91a1]">
                    {item.caption || t("No caption")}
                  </p>
                  <div className="mt-2 flex gap-3 text-[11px] text-[#8b91a1]">
                    <span>ER <b className="text-[#eceef3]">{fmtPercent(item.er)}</b></span>
                    <span>V/h <b className="text-[#eceef3]">{compact(item.velocity, locale)}</b></span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {limit < visible.length && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setLimit((value) => value + 36)}
                className="rounded-xl border border-[#343846] bg-[#171a22] px-4 py-2 text-sm font-semibold text-[#eceef3]"
              >
                {t("Show more")}
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/75 p-4 md:p-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="mx-auto max-w-5xl rounded-3xl border border-[#2d3240] bg-[#12141a] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">@{selected.username}</h2>
                  <span className="rounded-lg bg-[#ff3d6e] px-2 py-1 font-mono text-sm font-bold text-white">
                    {selected.outlier ? "×" + selected.outlier.toFixed(1) : "×—"}
                  </span>
                  {selected.analysis === "done" && (
                    <span className="rounded-lg bg-[#2ee59d] px-2 py-1 text-xs font-bold text-[#04130c]">
                      {t("ANALYZED")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#8b91a1]">{selected.niche || t("Unassigned")}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="h-9 w-9 rounded-xl border border-[#343846] bg-[#171a22] text-xl">×</button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
              <div>
                <div className="overflow-hidden rounded-2xl bg-black">
                  {selected.thumb ? (
                    <img src={selected.thumb} alt="" className="aspect-[9/16] w-full object-cover" />
                  ) : (
                    <div className="aspect-[9/16]" />
                  )}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    [t("Views"), compact(selected.plays, locale)],
                    ["Trend Score", selected.score?.toFixed(0) ?? "—"],
                    ["ER", fmtPercent(selected.er)],
                    [t("Velocity/h"), compact(selected.velocity, locale)],
                    [t("Likes"), compact(selected.likes, locale)],
                    [t("Comments"), compact(selected.comments, locale)],
                    ["Virality", selected.virality?.toFixed(3) ?? "—"],
                    ["Outlier", selected.outlier ? "×" + selected.outlier.toFixed(2) : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[#262a35] bg-[#171a22] p-3">
                      <span className="block text-[11px] text-[#8b91a1]">{label}</span>
                      <b className="mt-1 block font-mono text-base">{value}</b>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-[#171a22] p-4 text-sm leading-6 text-[#c9cdd6]">
                  {selected.caption || t("No caption")}
                </div>

                {selected.audio_title && (
                  <p className="mt-3 text-sm text-[#8b91a1]">♫ {selected.audio_title}</p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={"/trend-watch/analyzer?code=" + encodeURIComponent(selected.code)}
                    className="rounded-xl bg-[#ff3d6e] px-4 py-2 text-sm font-semibold text-white"
                  >
                    {selected.analysis === "done" ? t("Open analysis") : t("Analyze video")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggleSaved(selected)}
                    className="rounded-xl border border-[#343846] px-4 py-2 text-sm font-semibold"
                  >
                    {selected.saved ? "★ " + t("Saved") : "☆ " + t("Save idea")}
                  </button>
                  {selected.link && (
                    <a
                      href={selected.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-[#343846] px-4 py-2 text-sm text-[#c9cdd6]"
                    >
                      Instagram ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
