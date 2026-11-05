"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Niche = {
  id: string | number;
  name: string;
  accounts?: number;
};

type Account = {
  username: string;
  followers?: number | null;
  niche?: string | null;
  best_outlier?: number | null;
  status?: string | null;
  error?: string | null;
};

interface Props {
  initialNiches: Niche[];
  initialAccounts: Account[];
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch("/api/trend-watch/" + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error || "Trend Watch request failed");
  }
  return payload.data;
}

export default function TrendWatchCompetitorManager({
  initialNiches,
  initialAccounts,
}: Props) {
  const router = useRouter();
  const [niches, setNiches] = useState(initialNiches);
  const [accounts] = useState(initialAccounts);
  const [nicheName, setNicheName] = useState("");
  const [usernames, setUsernames] = useState("");
  const [nicheId, setNicheId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addNiche(event: FormEvent) {
    event.preventDefault();
    const name = nicheName.trim();
    if (!name) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await api("niches", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const item = data.item as Niche;
      setNiches((current) => {
        if (current.some((row) => String(row.id) === String(item.id))) {
          return current;
        }
        return [...current, { ...item, accounts: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      setNicheName("");
      setMessage("Niche added.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add niche");
    } finally {
      setBusy(false);
    }
  }

  async function addAccounts(event: FormEvent) {
    event.preventDefault();
    const raw = usernames.trim();
    if (!raw) return;
    setBusy(true);
    setMessage(null);
    try {
      const data = await api("accounts", {
        method: "POST",
        body: JSON.stringify({
          usernames: [raw],
          niche_id: nicheId ? Number(nicheId) : null,
        }),
      });
      setUsernames("");
      setMessage(
        data.added?.length
          ? "Added " + data.added.length + " account(s). Sync started."
          : "No new accounts were added."
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add accounts"
      );
    } finally {
      setBusy(false);
    }
  }

  async function syncAll() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await api("sync", {
        method: "POST",
        body: JSON.stringify({ usernames: null }),
      });
      setMessage(
        data.started
          ? "Sync started. Refresh this page in a moment."
          : "A sync is already running."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start sync");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={addNiche} className="panel rounded p-4">
          <h2 className="text-sm font-semibold text-foreground">Add niche</h2>
          <p className="mt-1 text-sm text-muted">
            Group competitors by market, product category or content angle.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              value={nicheName}
              onChange={(event) => setNicheName(event.target.value)}
              placeholder="e.g. TikTok Shop France"
              className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              disabled={busy}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>

        <form onSubmit={addAccounts} className="panel rounded p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Add competitors
          </h2>
          <p className="mt-1 text-sm text-muted">
            Paste usernames, profile links, or a comma-separated list.
          </p>
          <textarea
            value={usernames}
            onChange={(event) => setUsernames(event.target.value)}
            placeholder="@competitor1, https://instagram.com/competitor2"
            rows={3}
            className="mt-4 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={nicheId}
              onChange={(event) => setNicheId(event.target.value)}
              className="min-w-48 rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">No niche</option>
              {niches.map((niche) => (
                <option key={String(niche.id)} value={String(niche.id)}>
                  {niche.name}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Add & sync
            </button>
            <button
              type="button"
              onClick={syncAll}
              disabled={busy}
              className="rounded border border-border px-4 py-2 text-sm text-foreground disabled:opacity-50"
            >
              Sync all
            </button>
          </div>
        </form>
      </div>

      {message && (
        <div className="rounded border border-border bg-surface px-4 py-3 text-sm text-muted">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="panel rounded p-4">
          <h2 className="text-sm font-semibold text-foreground">Niches</h2>
          <div className="mt-3 space-y-2">
            {niches.map((niche) => (
              <div
                key={String(niche.id)}
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2"
              >
                <span className="text-sm text-foreground">{niche.name}</span>
                <span className="text-xs text-muted">{niche.accounts ?? 0}</span>
              </div>
            ))}
            {niches.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                No niches yet.
              </p>
            )}
          </div>
        </section>

        <section className="panel rounded p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Competitors
              </h2>
              <p className="mt-1 text-sm text-muted">
                Tracked Instagram accounts and their strongest recent outlier.
              </p>
            </div>
            <span className="text-sm text-muted">
              {accounts.length} accounts
            </span>
          </div>

          <div className="mt-4 divide-y divide-border">
            {accounts.map((account) => (
              <div
                key={account.username}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    @{account.username}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {account.niche || "Unassigned"} ·{" "}
                    {account.followers?.toLocaleString() ?? "—"} followers
                  </p>
                  {account.error && (
                    <p className="mt-1 text-xs text-error">{account.error}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-accent">
                  {account.best_outlier
                    ? "best ×" + account.best_outlier.toFixed(1)
                    : account.status === "error"
                      ? "Error"
                      : "Collecting"}
                </span>
              </div>
            ))}
            {accounts.length === 0 && (
              <p className="py-10 text-center text-sm text-muted">
                Add your first competitor to start monitoring.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
