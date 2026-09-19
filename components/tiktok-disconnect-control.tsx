"use client";

import { useState } from "react";

type Account = {
  id: string;
  username: string | null;
  displayName: string | null;
};

function label(account: Account) {
  if (account.username) return `@${account.username}`;
  return account.displayName || "TikTok Business Account";
}

export default function TikTokDisconnectControl({
  accounts,
  canManage,
}: {
  accounts: Account[];
  canManage: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage || accounts.length === 0) return null;

  async function disconnect(account: Account) {
    if (
      !window.confirm(
        `Disconnect ${label(account)}? Campaigns, durable matches, and history will be preserved and will return after reconnecting the same TikTok account.`
      )
    ) {
      return;
    }

    setBusyId(account.id);
    setError(null);
    try {
      const response = await fetch("/api/tiktok/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiktokAccountId: account.id }),
      });
      const payload = await response.json();
      if (!payload.success) {
        setError(payload.error ?? "Could not disconnect TikTok account");
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not disconnect TikTok account");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto rounded border border-border bg-surface/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">TikTok connection</p>
          <p className="mt-1 text-xs text-muted">
            Disconnect is non-destructive: campaigns and routing history stay stored for same-account reconnect.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => void disconnect(account)}
              disabled={busyId !== null}
              className="rounded border border-error/20 px-3 py-2 text-xs font-medium text-error transition-colors hover:border-error/40 hover:bg-error/10 disabled:opacity-50"
            >
              {busyId === account.id
                ? "Disconnecting…"
                : `Disconnect ${label(account)}`}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-error">{error}</p>}
    </div>
  );
}
