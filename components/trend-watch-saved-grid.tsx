"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

export type TrendWatchSavedIdea = {
  code: string;
  username: string;
  caption?: string | null;
  link?: string | null;
  thumb?: string | null;
  plays?: number | null;
  outlier?: number | null;
  velocity?: number | null;
  er?: number | null;
  score?: number | null;
};

function compact(value: number | null | undefined, locale: "en" | "uk") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function TrendWatchSavedGrid({
  initialItems,
}: {
  initialItems: TrendWatchSavedIdea[];
}) {
  const { locale, t } = useLocale();
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
      if (!payload.success) throw new Error(payload.error || t("Could not remove saved idea"));
      setItems((current) => current.filter((item) => item.code !== code));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not remove saved idea"));
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-4 text-[#eceef3]">
      {error && (
        <div className="rounded-xl border border-[#5a1f2e] bg-[#171a22] px-4 py-3 text-sm text-[#ff3d6e]">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#343846] bg-[#12141a] p-12 text-center text-sm text-[#8b91a1]">
          {t("No saved ideas yet.")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((idea) => (
            <article key={idea.code} className="overflow-hidden rounded-2xl border border-[#262a35] bg-[#171a22]">
              <div className="relative aspect-[9/14] bg-[#0f1116]">
                {idea.thumb ? (
                  <img src={idea.thumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[#666d7c]">No preview</div>
                )}
                <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 font-mono text-sm font-bold text-[#ffb020]">
                  {idea.outlier ? "×" + idea.outlier.toFixed(1) : "★"}
                </span>
                <button
                  type="button"
                  disabled={busyCode === idea.code}
                  onClick={() => void removeSaved(idea.code)}
                  className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-black/60 text-[#ffb020] disabled:opacity-50"
                  aria-label={t("Remove saved")}
                >
                  ★
                </button>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs font-semibold text-white">
                  <span>{compact(idea.plays, locale)} ▶</span>
                  <span>{idea.score?.toFixed(0) ?? "—"} score</span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold">@{idea.username}</p>
                <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-[#8b91a1]">
                  {idea.caption || t("No caption")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={"/trend-watch/analyzer?code=" + encodeURIComponent(idea.code)}
                    className="rounded-lg bg-[#ff3d6e] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t("Analyze")}
                  </a>
                  {idea.link && (
                    <a
                      href={idea.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-[#343846] px-3 py-1.5 text-xs text-[#c9cdd6]"
                    >
                      Instagram ↗
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
