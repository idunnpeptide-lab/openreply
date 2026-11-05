"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/locale-provider";

export type TrendWatchOutlier = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  thumb?: string | null;
  plays?: number | null;
  outlier?: number | null;
  velocity?: number | null;
  score?: number | null;
  er?: number | null;
  published_at?: string | null;
  saved?: boolean | null;
};

function compact(value: number | null | undefined, locale: "en" | "uk") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", { notation: "compact" }).format(value);
}

export default function TrendWatchOutlierGrid({
  initialItems,
}: {
  initialItems: TrendWatchOutlier[];
}) {
  const { locale, t } = useLocale();
  const [items, setItems] = useState(initialItems);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [minOutlier, setMinOutlier] = useState(3);
  const [sortBy, setSortBy] = useState<"score" | "outlier" | "plays" | "velocity">("score");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const visibleItems = useMemo(() => {
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    return items
      .filter((item) => {
        if ((item.outlier ?? 0) < minOutlier) return false;
        if (!item.published_at) return true;
        const published = new Date(item.published_at).getTime();
        return Number.isNaN(published) || published >= cutoff;
      })
      .sort((a, b) => {
        const left = a[sortBy] ?? 0;
        const right = b[sortBy] ?? 0;
        return Number(right) - Number(left);
      });
  }, [items, minOutlier, periodDays, sortBy]);

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
      if (!payload.success) {
        throw new Error(payload.error || "Could not update saved state");
      }
      setItems((current) =>
        current.map((row) =>
          row.code === item.code ? { ...row, saved: !item.saved } : row
        )
      );
    } finally {
      setBusyCode(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="panel rounded p-8 text-center text-sm text-muted">
        {t("Add competitors and run a sync to discover outliers.")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel flex flex-wrap items-end gap-3 rounded p-3">
        <label className="text-xs text-muted">
          <span className="mb-1 block">{t("Period")}</span>
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value={7}>{t("7 days")}</option>
            <option value={30}>{t("30 days")}</option>
            <option value={90}>{t("90 days")}</option>
          </select>
        </label>

        <label className="text-xs text-muted">
          <span className="mb-1 block">{t("Minimum outlier")}</span>
          <select
            value={minOutlier}
            onChange={(event) => setMinOutlier(Number(event.target.value))}
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value={2}>×2+</option>
            <option value={3}>×3+</option>
            <option value={5}>×5+</option>
            <option value={10}>×10+</option>
          </select>
        </label>

        <label className="text-xs text-muted">
          <span className="mb-1 block">{t("Sort by")}</span>
          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "score" | "outlier" | "plays" | "velocity"
              )
            }
            className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="score">{t("Score")}</option>
            <option value="outlier">Outlier ×</option>
            <option value="plays">{t("Views")}</option>
            <option value="velocity">{t("Velocity")}</option>
          </select>
        </label>

        <span className="ml-auto pb-2 text-sm text-muted">
          {visibleItems.length} {t("shown")}
        </span>
      </div>

      {visibleItems.length === 0 ? (
        <div className="panel rounded p-8 text-center text-sm text-muted">
          {t("No Reels match these filters.")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleItems.map((item) => (
        <article key={item.code} className="panel overflow-hidden rounded">
          {item.thumb && (
            <img
              src={item.thumb}
              alt=""
              className="aspect-video w-full object-cover"
            />
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                @{item.username}
              </p>
              <span className="rounded bg-background px-2 py-1 text-sm font-semibold text-accent">
                {item.outlier ? "×" + item.outlier.toFixed(1) : "—"}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              {item.caption || t("No caption")}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
              <div>
                <span className="block text-zinc-500">{t("Views")}</span>
                <span className="mt-1 block text-sm text-foreground">
                  {compact(item.plays, locale)}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500">{t("Velocity/h")}</span>
                <span className="mt-1 block text-sm text-foreground">
                  {compact(item.velocity, locale)}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500">{t("Score")}</span>
                <span className="mt-1 block text-sm text-foreground">
                  {item.score?.toFixed(0) ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={"/trend-watch/analyzer?code=" + encodeURIComponent(item.code)}
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                {t("Analyze")}
              </Link>
              <button
                type="button"
                disabled={busyCode === item.code}
                onClick={() => toggleSaved(item)}
                className="rounded border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
              >
                {item.saved ? t("Saved ✓") : t("Save idea")}
              </button>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        </article>
      ))}
        </div>
      )}
    </div>
  );
}
