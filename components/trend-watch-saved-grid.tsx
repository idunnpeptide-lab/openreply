"use client";

import { useState } from "react";

export type TrendWatchSavedIdea = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  outlier?: number | null;
};

export default function TrendWatchSavedGrid({
  initialItems,
}: {
  initialItems: TrendWatchSavedIdea[];
}) {
  const [items, setItems] = useState(initialItems);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeSaved(code: string) {
    setBusyCode(code);
    setError(null);
    try {
      const response = await fetch(
        "/api/trend-watch/reels/" + encodeURIComponent(code) + "/saved",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        }
      );
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || "Could not remove saved idea");
      }
      setItems((current) => current.filter((item) => item.code !== code));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove saved idea"
      );
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((idea) => (
          <article key={idea.code} className="panel rounded p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                @{idea.username}
              </p>
              <span className="text-sm font-semibold text-accent">
                {idea.outlier ? "×" + idea.outlier.toFixed(1) : "Saved"}
              </span>
            </div>

            <p className="mt-2 line-clamp-3 text-sm text-muted">
              {idea.caption || "No caption"}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={
                  "/trend-watch/analyzer?code=" + encodeURIComponent(idea.code)
                }
                className="rounded bg-accent px-3 py-2 text-sm font-medium text-white"
              >
                Analyze
              </a>

              <button
                type="button"
                disabled={busyCode === idea.code}
                onClick={() => removeSaved(idea.code)}
                className="rounded border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
              >
                {busyCode === idea.code ? "Removing…" : "Remove saved"}
              </button>

              {idea.link && (
                <a
                  href={idea.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
                >
                  Instagram
                </a>
              )}
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="panel rounded p-10 text-center text-sm text-muted md:col-span-2">
            No saved ideas yet.
          </div>
        )}
      </div>
    </div>
  );
}
