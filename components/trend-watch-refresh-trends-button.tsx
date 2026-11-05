"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrendWatchRefreshTrendsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/trend-watch/trends/refresh", {
        method: "POST",
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || "Could not refresh trends");
      }
      setMessage(
        "Refreshed " + (payload.data?.count ?? 0) + " trend entries."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not refresh trends"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={refresh}
        disabled={busy}
        className="rounded border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover disabled:opacity-50"
      >
        {busy ? "Refreshing…" : "Refresh trends"}
      </button>
      {message && (
        <p className="max-w-xs text-right text-xs text-muted">{message}</p>
      )}
    </div>
  );
}
