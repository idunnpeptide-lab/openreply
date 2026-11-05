"use client";

import Link from "next/link";
import { useState } from "react";

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
  saved?: boolean | null;
};

function compact(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

export default function TrendWatchOutlierGrid({
  initialItems,
}: {
  initialItems: TrendWatchOutlier[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busyCode, setBusyCode] = useState<string | null>(null);

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
        Add competitors and run a sync to discover outliers.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
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
              {item.caption || "No caption"}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
              <div>
                <span className="block text-zinc-500">Views</span>
                <span className="mt-1 block text-sm text-foreground">
                  {compact(item.plays)}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500">Velocity/h</span>
                <span className="mt-1 block text-sm text-foreground">
                  {compact(item.velocity)}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500">Score</span>
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
                Analyze
              </Link>
              <button
                type="button"
                disabled={busyCode === item.code}
                onClick={() => toggleSaved(item)}
                className="rounded border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
              >
                {item.saved ? "Saved ✓" : "Save idea"}
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
  );
}
