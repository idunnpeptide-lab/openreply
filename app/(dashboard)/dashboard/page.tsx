"use client";

/**
 * Dashboard Home Page
 *
 * Launch-oriented overview: onboarding, core funnel metrics, 7-day delivery
 * trend, keyword performance and recent activity.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import LaunchOnboarding from "@/components/launch-onboarding";
import StatCard from "@/components/stat-card";
import StatusBadge from "@/components/status-badge";

interface DashboardStats {
  userName: string | null;
  contactsCount: number;
  totalAutomations: number;
  activeAutomations: number;
  dmsSentToday: number;
  dmsSentWeek: number;
  dmsSentMonth: number;
  dmsSkippedMonth: number;
  dmsFailedMonth: number;
  totalDMs: number;
  clicksThisMonth: number;
  totalClicks: number;
  ctrThisMonth: number;
  instagramAccounts: AccountOption[];
  selectedInstagramAccountId: string | null;
  topKeywords: { keyword: string; count: number }[];
  dailyDMs: { date: string; count: number }[];
  recentLogs: Array<{
    id: string;
    commenterName: string | null;
    commentText: string;
    status: string;
    createdAt: string;
    automation: { name: string };
    instagramAccount?: { username: string };
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (selectedAccountId !== "all") {
      params.set("instagramAccountId", selectedAccountId);
    }

    fetch(`/api/dashboard/stats${params.size ? `?${params}` : ""}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error("dashboard_failed");
        if (!cancelled) {
          setStats(payload.data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, retryKey]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setLoadError(false);
    setSelectedAccountId(accountId);
  }

  function retryDashboard() {
    setLoading(true);
    setLoadError(false);
    setRetryKey((value) => value + 1);
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="panel h-32 rounded p-5">
              <div className="h-10 w-10 rounded bg-surface-hover" />
              <div className="mt-4 h-6 w-16 rounded bg-surface-hover" />
              <div className="mt-2 h-4 w-24 rounded bg-surface-hover/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-xl panel rounded-xl p-6 text-center sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">
          We could not load your dashboard
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Your automations and history are still saved. Retry the dashboard, or
          check the Instagram connection if the problem continues.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={retryDashboard}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Retry dashboard
          </button>
          <Link
            href="/settings"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Check connection
          </Link>
        </div>
      </div>
    );
  }

  const maxDM = Math.max(...stats.dailyDMs.map((d) => d.count), 1);
  const connectedCount = stats.instagramAccounts.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Hello, {stats.userName ?? "there"}!
          </h1>
          <p className="mt-1 text-sm text-muted">
            {connectedCount} connected{" "}
            {connectedCount === 1 ? "account" : "accounts"}
            {" · "}
            {stats.contactsCount} {stats.contactsCount === 1 ? "contact" : "contacts"}
            {" · "}
            <Link href="/logs" className="text-accent hover:underline">
              See activity
            </Link>
          </p>
        </div>
        {stats.instagramAccounts.length > 1 && (
          <AccountSelect
            accounts={stats.instagramAccounts}
            value={selectedAccountId}
            onChange={handleAccountChange}
          />
        )}
      </div>

      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Could not refresh the latest numbers
            </p>
            <p className="mt-0.5 text-xs text-muted">
              The last loaded dashboard is still shown below.
            </p>
          </div>
          <button
            type="button"
            onClick={retryDashboard}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Retry
          </button>
        </div>
      )}

      <LaunchOnboarding
        connectedAccounts={connectedCount}
        activeAutomations={stats.activeAutomations}
      />

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Launch performance</h2>
            <p className="mt-0.5 text-xs text-muted">
              Delivery and link activity for the current month.
            </p>
          </div>
          {connectedCount > 0 && (
            <Link href="/campaigns/quick" className="text-xs font-medium text-accent hover:underline">
              New quick automation
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Active Automations" value={stats.activeAutomations} />
          <StatCard label="DMs Sent" value={stats.dmsSentMonth} />
          <StatCard label="Link Clicks" value={stats.clicksThisMonth} />
          <StatCard label="CTR" value={`${stats.ctrThisMonth}%`} />
          <StatCard label="Failed" value={stats.dmsFailedMonth} />
          <StatCard label="Skipped" value={stats.dmsSkippedMonth} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-6">
        <div className="panel rounded p-4 sm:p-6 lg:col-span-3">
          <h2 className="mb-6 text-sm font-semibold text-foreground">DMs — Last 7 Days</h2>
          {stats.dailyDMs.every((day) => day.count === 0) ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-foreground">No DMs sent yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Once your first automation starts sending, the 7-day trend will appear here.
              </p>
              {connectedCount > 0 && stats.totalAutomations === 0 && (
                <Link href="/campaigns/quick" className="mt-3 text-xs font-medium text-accent hover:underline">
                  Create your first automation
                </Link>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-end gap-1.5 sm:gap-2">
              {stats.dailyDMs.map((day) => (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-muted">{day.count}</span>
                  <div
                    className="min-h-[4px] w-full rounded-sm bg-accent"
                    style={{ height: `${Math.max((day.count / maxDM) * 100, 4)}%` }}
                  />
                  <span className="w-full truncate text-center text-[10px] text-zinc-500">
                    {day.date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel rounded p-4 sm:p-6 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Top Keywords</h2>
          <div className="space-y-3">
            {stats.topKeywords.length === 0 && (
              <p className="py-8 text-sm text-muted">No keyword matches yet</p>
            )}
            {stats.topKeywords.map((keyword) => (
              <div key={keyword.keyword} className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-foreground">
                  {keyword.keyword}
                </span>
                <span className="text-xs text-muted">{keyword.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel rounded p-4 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            {stats.recentLogs.length > 0 && (
              <Link href="/logs" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            )}
          </div>
          <div className="max-h-60 space-y-3 overflow-y-auto">
            {stats.recentLogs.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-foreground">No activity yet</p>
                <p className="mt-1 text-xs text-muted">
                  Matches and delivery events will appear here after your automation goes live.
                </p>
              </div>
            )}
            {stats.recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    @{log.commenterName ?? "unknown"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {log.instagramAccount ? `@${log.instagramAccount.username} · ` : ""}
                    {log.commentText}
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
