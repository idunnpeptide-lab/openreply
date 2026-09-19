"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTikTokStagingReadiness,
  type TikTokCapabilitySnapshot,
} from "@/lib/tiktok/staging-readiness";

type TikTokStatus = {
  provider: "TIKTOK";
  phase: "STAGING_FOUNDATION";
  oauthConfigured: boolean;
  canManage: boolean;
  liveExecutionEnabled: boolean;
};

type TikTokAccount = TikTokCapabilitySnapshot & {
  id: string;
  openId: string;
  username: string | null;
  displayName: string | null;
  tokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  grantedScopes: string[];
  connectedAt: string;
  updatedAt: string;
  _count: {
    automations: number;
    automationMatches: number;
  };
};

type TikTokVideo = {
  item_id: string;
  caption?: string;
  video_views?: number;
  comments?: number;
  likes?: number;
  create_time?: number;
};

type TikTokAutomation = {
  id: string;
  tiktokAccountId: string;
  name: string;
  goal: string | null;
  videoId: string | null;
  matchAnyVideo: boolean;
  commentTriggerEnabled: boolean;
  messageTriggerEnabled: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  wholeWordMatch: boolean;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  dmReplyEnabled: boolean;
  dmMessage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { matches: number };
};

type FormState = {
  name: string;
  goal: string;
  videoId: string;
  matchAnyVideo: boolean;
  commentTriggerEnabled: boolean;
  messageTriggerEnabled: boolean;
  keywordsText: string;
  matchAnyWord: boolean;
  wholeWordMatch: boolean;
  publicReplyMessage: string;
  dmMessage: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  goal: "",
  videoId: "",
  matchAnyVideo: true,
  commentTriggerEnabled: true,
  messageTriggerEnabled: false,
  keywordsText: "INFO",
  matchAnyWord: false,
  wholeWordMatch: true,
  publicReplyMessage: "",
  dmMessage: "",
  isActive: true,
};

function displayAccountName(account: TikTokAccount) {
  if (account.username) return `@${account.username}`;
  return account.displayName || account.openId;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function capabilityClass(enabled: boolean) {
  return enabled
    ? "bg-success/10 text-success border-success/20"
    : "bg-zinc-500/10 text-muted border-border";
}

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export default function TikTokStagingConsole() {
  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [accounts, setAccounts] = useState<TikTokAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [campaigns, setCampaigns] = useState<TikTokAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerLoading, setProviderLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );
  const readiness = useMemo(
    () => (selectedAccount ? getTikTokStagingReadiness(selectedAccount) : null),
    [selectedAccount]
  );

  const loadProviderData = useCallback(async (accountId: string) => {
    if (!accountId) {
      setVideos([]);
      setCampaigns([]);
      return;
    }

    setProviderLoading(true);
    setError(null);
    try {
      const [videosResponse, campaignsResponse] = await Promise.all([
        fetch(
          `/api/tiktok/videos?tiktokAccountId=${encodeURIComponent(accountId)}&maxCount=20`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/tiktok/automations?tiktokAccountId=${encodeURIComponent(accountId)}`,
          { cache: "no-store" }
        ),
      ]);
      const [videosPayload, campaignsPayload] = await Promise.all([
        videosResponse.json(),
        campaignsResponse.json(),
      ]);

      if (videosPayload.success) {
        setVideos(videosPayload.data.items ?? []);
      } else {
        setVideos([]);
        setError(videosPayload.error ?? "Could not load TikTok videos");
      }

      if (campaignsPayload.success) {
        setCampaigns(campaignsPayload.data ?? []);
      } else {
        setCampaigns([]);
        setError((current) =>
          current ?? campaignsPayload.error ?? "Could not load TikTok campaigns"
        );
      }
    } catch {
      setVideos([]);
      setCampaigns([]);
      setError("Could not load TikTok staging data");
    } finally {
      setProviderLoading(false);
    }
  }, []);

  const loadFoundation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResponse, accountsResponse] = await Promise.all([
        fetch("/api/tiktok/status", { cache: "no-store" }),
        fetch("/api/tiktok/accounts", { cache: "no-store" }),
      ]);
      const [statusPayload, accountsPayload] = await Promise.all([
        statusResponse.json(),
        accountsResponse.json(),
      ]);

      if (!statusPayload.success) {
        throw new Error(statusPayload.error ?? "Could not load TikTok status");
      }
      if (!accountsPayload.success) {
        throw new Error(accountsPayload.error ?? "Could not load TikTok accounts");
      }

      const nextAccounts = (accountsPayload.data ?? []) as TikTokAccount[];
      setStatus(statusPayload.data);
      setAccounts(nextAccounts);
      setSelectedAccountId((current) => {
        if (current && nextAccounts.some((account) => account.id === current)) {
          return current;
        }
        return nextAccounts[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load TikTok staging status"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFoundation();
  }, [loadFoundation]);

  useEffect(() => {
    void loadProviderData(selectedAccountId);
  }, [loadProviderData, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccount || editingId) return;
    const next = getTikTokStagingReadiness(selectedAccount);
    setForm((current) => ({
      ...EMPTY_FORM,
      commentTriggerEnabled: next.commentCampaignReady,
      messageTriggerEnabled:
        !next.commentCampaignReady && next.dmCampaignReady,
      publicReplyMessage: current.publicReplyMessage,
      dmMessage: current.dmMessage,
    }));
  }, [selectedAccount, editingId]);

  function resetForm() {
    const nextReadiness = selectedAccount
      ? getTikTokStagingReadiness(selectedAccount)
      : null;
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      commentTriggerEnabled: nextReadiness?.commentCampaignReady ?? false,
      messageTriggerEnabled:
        !(nextReadiness?.commentCampaignReady ?? false) &&
        Boolean(nextReadiness?.dmCampaignReady),
    });
    setNotice(null);
    setError(null);
  }

  function editCampaign(campaign: TikTokAutomation) {
    setEditingId(campaign.id);
    setForm({
      name: campaign.name,
      goal: campaign.goal ?? "",
      videoId: campaign.videoId ?? "",
      matchAnyVideo: campaign.matchAnyVideo,
      commentTriggerEnabled: campaign.commentTriggerEnabled,
      messageTriggerEnabled: campaign.messageTriggerEnabled,
      keywordsText: campaign.keywords.join(", "),
      matchAnyWord: campaign.matchAnyWord,
      wholeWordMatch: campaign.wholeWordMatch,
      publicReplyMessage: campaign.publicReplyMessage ?? "",
      dmMessage: campaign.dmMessage ?? "",
      isActive: campaign.isActive,
    });
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateForm() {
    if (!selectedAccount || !readiness) return "Connect a TikTok account first";
    if (!form.name.trim()) return "Campaign name is required";
    if (!form.commentTriggerEnabled && !form.messageTriggerEnabled) {
      return "Enable at least one TikTok trigger";
    }

    const keywords = parseKeywords(form.keywordsText);
    if (!form.matchAnyWord && keywords.length === 0) {
      return "Add at least one keyword or enable match-any-word";
    }
    if (form.commentTriggerEnabled) {
      if (!readiness.commentCampaignReady) {
        return "This TikTok account is not ready for comment campaigns";
      }
      if (!form.matchAnyVideo && !form.videoId) {
        return "Choose a TikTok video or match any owned video";
      }
      if (!form.publicReplyMessage.trim()) {
        return "Public reply text is required";
      }
      if (form.publicReplyMessage.trim().length > 150) {
        return "TikTok public replies are limited to 150 characters";
      }
    }
    if (form.messageTriggerEnabled) {
      if (!readiness.dmCampaignReady) {
        return "This TikTok account does not have Business Messaging capability";
      }
      if (!form.dmMessage.trim()) return "DM reply text is required";
      if (form.dmMessage.trim().length > 6000) {
        return "TikTok DM replies are limited to 6,000 characters";
      }
    }
    return null;
  }

  async function saveCampaign(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const keywords = parseKeywords(form.keywordsText);
    const payload = {
      ...(editingId ? {} : { tiktokAccountId: selectedAccountId }),
      name: form.name.trim(),
      goal: form.goal.trim() || null,
      videoId:
        form.commentTriggerEnabled && !form.matchAnyVideo
          ? form.videoId || null
          : null,
      matchAnyVideo: form.commentTriggerEnabled ? form.matchAnyVideo : false,
      commentTriggerEnabled: form.commentTriggerEnabled,
      messageTriggerEnabled: form.messageTriggerEnabled,
      keywords: form.matchAnyWord ? [] : keywords,
      matchAnyWord: form.matchAnyWord,
      wholeWordMatch: form.wholeWordMatch,
      publicReplyEnabled: form.commentTriggerEnabled,
      publicReplyMessage: form.commentTriggerEnabled
        ? form.publicReplyMessage.trim()
        : null,
      dmReplyEnabled: form.messageTriggerEnabled,
      dmMessage: form.messageTriggerEnabled ? form.dmMessage.trim() : null,
      isActive: form.isActive,
    };

    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        editingId
          ? `/api/tiktok/automations?id=${encodeURIComponent(editingId)}`
          : "/api/tiktok/automations",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? "Could not save TikTok campaign");
        return;
      }

      setNotice(
        editingId
          ? "TikTok staging campaign updated. Live send execution is still locked."
          : "TikTok staging campaign created. Routing can be observed, but live send execution is still locked."
      );
      resetForm();
      await loadProviderData(selectedAccountId);
    } catch {
      setError("Could not save TikTok campaign");
    } finally {
      setBusy(null);
    }
  }

  async function deleteCampaign(campaign: TikTokAutomation) {
    if (!window.confirm(`Delete TikTok campaign “${campaign.name}”?`)) return;
    setBusy(`delete:${campaign.id}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/tiktok/automations?id=${encodeURIComponent(campaign.id)}`,
        { method: "DELETE" }
      );
      const payload = await response.json();
      if (!payload.success) {
        setError(payload.error ?? "Could not delete TikTok campaign");
        return;
      }
      if (editingId === campaign.id) resetForm();
      await loadProviderData(selectedAccountId);
    } catch {
      setError("Could not delete TikTok campaign");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="panel rounded p-8 h-64" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">TikTok staging</h1>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Provider QA
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Configure and inspect the additive TikTok provider without changing the proven Instagram automation path.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFoundation()}
          className="rounded border border-border px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
        >
          Refresh status
        </button>
      </div>

      <section className="panel rounded p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Provider readiness</h2>
            <p className="mt-1 text-xs text-muted">
              OAuth/account capabilities are real provider state. Live TikTok send execution remains intentionally locked until staging E2E is approved.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              status?.liveExecutionEnabled
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {status?.liveExecutionEnabled ? "Live execution enabled" : "Execution locked"}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-border bg-surface/70 p-3">
            <p className="text-xs text-muted">Developer app OAuth</p>
            <p className="mt-1 text-sm font-semibold">
              {status?.oauthConfigured ? "Configured" : "Not configured"}
            </p>
          </div>
          <div className="rounded border border-border bg-surface/70 p-3">
            <p className="text-xs text-muted">Connected TikTok accounts</p>
            <p className="mt-1 text-sm font-semibold">{accounts.length}</p>
          </div>
          <div className="rounded border border-border bg-surface/70 p-3">
            <p className="text-xs text-muted">Rollout phase</p>
            <p className="mt-1 text-sm font-semibold">Staging foundation</p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="mt-5 rounded border border-border bg-surface/70 p-4">
            <p className="text-sm font-medium">No TikTok Business Account connected yet.</p>
            <p className="mt-1 text-xs text-muted">
              The UI and backend foundation are ready. A real developer app/account is required before live provider E2E can begin.
            </p>
            {status?.oauthConfigured && status.canManage ? (
              <a
                href="/api/tiktok/connect"
                className="mt-4 inline-flex rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Connect TikTok Business Account
              </a>
            ) : (
              <p className="mt-3 text-xs text-warning">
                TikTok developer-app OAuth must be configured before the connect flow can start.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <label className="text-xs font-medium text-muted" htmlFor="tiktok-account">
              TikTok account
            </label>
            <select
              id="tiktok-account"
              value={selectedAccountId}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setEditingId(null);
              }}
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm sm:max-w-md"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {displayAccountName(account)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedAccount && readiness && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs ${capabilityClass(selectedAccount.commentsEnabled)}`}>
                Comments {selectedAccount.commentsEnabled ? "ready" : "blocked"}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${capabilityClass(selectedAccount.publicReplyEnabled)}`}>
                Public reply {selectedAccount.publicReplyEnabled ? "ready" : "blocked"}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${capabilityClass(selectedAccount.messagingEnabled)}`}>
                Business Messaging {selectedAccount.messagingEnabled ? "ready" : "blocked"}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${capabilityClass(selectedAccount.commentToMessageEnabled)}`}>
                Comment-to-Message {selectedAccount.commentToMessageEnabled ? "eligible" : "not eligible"}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${capabilityClass(selectedAccount.webhookConfigured)}`}>
                Webhook {selectedAccount.webhookConfigured ? "configured" : "not confirmed"}
              </span>
            </div>

            <div className="grid gap-3 text-xs text-muted sm:grid-cols-3">
              <div>
                <span className="block">Access token expires</span>
                <span className="mt-1 block text-foreground">{formatDate(selectedAccount.tokenExpiresAt)}</span>
              </div>
              <div>
                <span className="block">Refresh token expires</span>
                <span className="mt-1 block text-foreground">{formatDate(selectedAccount.refreshTokenExpiresAt)}</span>
              </div>
              <div>
                <span className="block">Granted scopes</span>
                <span className="mt-1 block text-foreground">{selectedAccount.grantedScopes.length}</span>
              </div>
            </div>

            {selectedAccount.grantedScopes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAccount.grantedScopes.map((scope) => (
                  <code key={scope} className="rounded bg-surface-hover px-2 py-1 text-[11px] text-muted">
                    {scope}
                  </code>
                ))}
              </div>
            )}

            <div className="rounded border border-warning/30 bg-warning/5 p-3 text-xs text-muted">
              <strong className="text-warning">Safety gate:</strong> campaigns created here can match verified provider events and persist routing plans, but ReplyHalo does not execute TikTok public replies or campaign DMs yet.
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      {selectedAccount && readiness && (
        <>
          <section className="panel rounded p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Owned videos</h2>
                <p className="mt-1 text-xs text-muted">
                  Loaded from the official TikTok Business API for video-scoped comment campaigns.
                </p>
              </div>
              <span className="text-xs text-muted">
                {providerLoading ? "Loading…" : `${videos.length} loaded`}
              </span>
            </div>

            {videos.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                {providerLoading
                  ? "Loading owned videos…"
                  : "No videos are available from the provider yet. You can still configure an any-video campaign when comment capability is granted."}
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {videos.map((video) => (
                  <button
                    type="button"
                    key={video.item_id}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        commentTriggerEnabled: true,
                        matchAnyVideo: false,
                        videoId: video.item_id,
                      }))
                    }
                    className="rounded border border-border p-3 text-left hover:bg-surface-hover"
                  >
                    <p className="line-clamp-2 text-sm text-foreground">
                      {video.caption?.trim() || "Untitled TikTok video"}
                    </p>
                    <p className="mt-2 break-all text-[11px] text-muted">{video.item_id}</p>
                    <div className="mt-2 flex gap-3 text-[11px] text-muted">
                      <span>{video.video_views ?? 0} views</span>
                      <span>{video.comments ?? 0} comments</span>
                      <span>{video.likes ?? 0} likes</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel rounded p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">
                  {editingId ? "Edit TikTok staging campaign" : "New TikTok staging campaign"}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Comment and inbound-DM routing can be configured now; live provider sends remain locked.
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={saveCampaign} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs font-medium text-muted">Campaign name</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    maxLength={100}
                    className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                    placeholder="TikTok INFO campaign"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-medium text-muted">Goal (optional)</span>
                  <input
                    value={form.goal}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, goal: event.target.value }))
                    }
                    maxLength={120}
                    className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Deliver information from a verified trigger"
                  />
                </label>
              </div>

              <div className="rounded border border-border p-4">
                <p className="text-sm font-medium">Triggers</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className={`flex items-start gap-3 rounded border p-3 ${readiness.commentCampaignReady ? "border-border" : "border-border opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={form.commentTriggerEnabled}
                      disabled={!readiness.commentCampaignReady}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          commentTriggerEnabled: event.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium">Comment keyword</span>
                      <span className="mt-1 block text-xs text-muted">
                        Requires comment access + public-reply capability.
                      </span>
                    </span>
                  </label>
                  <label className={`flex items-start gap-3 rounded border p-3 ${readiness.dmCampaignReady ? "border-border" : "border-border opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={form.messageTriggerEnabled}
                      disabled={!readiness.dmCampaignReady}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          messageTriggerEnabled: event.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium">Inbound DM keyword</span>
                      <span className="mt-1 block text-xs text-muted">
                        Replies only inside an existing user-started Business Messaging conversation.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded border border-border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Keyword match</p>
                    <p className="mt-1 text-xs text-muted">Up to 10 comma-separated keywords.</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={form.matchAnyWord}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          matchAnyWord: event.target.checked,
                        }))
                      }
                    />
                    Match any text
                  </label>
                </div>
                {!form.matchAnyWord && (
                  <input
                    value={form.keywordsText}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        keywordsText: event.target.value,
                      }))
                    }
                    className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                    placeholder="INFO, GUIDE, START"
                  />
                )}
                <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={form.wholeWordMatch}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        wholeWordMatch: event.target.checked,
                      }))
                    }
                  />
                  Whole-word matching
                </label>
              </div>

              {form.commentTriggerEnabled && (
                <div className="rounded border border-border p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium">Comment campaign</p>
                    <p className="mt-1 text-xs text-muted">
                      A verified matching comment creates an inert PUBLIC_REPLY action plan during staging.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={form.matchAnyVideo}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          matchAnyVideo: event.target.checked,
                          videoId: event.target.checked ? "" : current.videoId,
                        }))
                      }
                    />
                    Match any owned video
                  </label>
                  {!form.matchAnyVideo && (
                    <label className="block text-sm">
                      <span className="text-xs font-medium text-muted">Owned video</span>
                      <select
                        value={form.videoId}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            videoId: event.target.value,
                          }))
                        }
                        className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Choose a video</option>
                        {videos.map((video) => (
                          <option key={video.item_id} value={video.item_id}>
                            {(video.caption?.trim() || "Untitled video").slice(0, 70)} — {video.item_id}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block text-sm">
                    <span className="flex items-center justify-between text-xs font-medium text-muted">
                      <span>Public reply text</span>
                      <span>{form.publicReplyMessage.length}/150</span>
                    </span>
                    <textarea
                      value={form.publicReplyMessage}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          publicReplyMessage: event.target.value,
                        }))
                      }
                      maxLength={150}
                      rows={3}
                      className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Thanks — check the next step in ReplyHalo."
                    />
                  </label>
                </div>
              )}

              {form.messageTriggerEnabled && (
                <div className="rounded border border-border p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium">Inbound DM campaign</p>
                    <p className="mt-1 text-xs text-muted">
                      This path never starts a cold conversation; it only plans a reply after a real inbound user message.
                    </p>
                  </div>
                  <label className="block text-sm">
                    <span className="flex items-center justify-between text-xs font-medium text-muted">
                      <span>DM reply text</span>
                      <span>{form.dmMessage.length}/6000</span>
                    </span>
                    <textarea
                      value={form.dmMessage}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          dmMessage: event.target.value,
                        }))
                      }
                      maxLength={6000}
                      rows={5}
                      className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Here is the information you requested."
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Enable provider-event matching
                </label>
                <button
                  type="submit"
                  disabled={busy === "save" || !status?.canManage}
                  className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "save"
                    ? "Saving…"
                    : editingId
                      ? "Update staging campaign"
                      : "Create staging campaign"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel rounded p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">TikTok campaigns</h2>
                <p className="mt-1 text-xs text-muted">
                  Match counts are durable routing evidence; they do not mean a TikTok message was sent.
                </p>
              </div>
              <span className="text-xs text-muted">{campaigns.length} campaigns</span>
            </div>

            {campaigns.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No TikTok staging campaigns yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {campaigns.map((campaign) => (
                  <article key={campaign.id} className="rounded border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{campaign.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${campaign.isActive ? "bg-success/10 text-success" : "bg-zinc-500/10 text-muted"}`}>
                            {campaign.isActive ? "Matching on" : "Paused"}
                          </span>
                          {!status?.liveExecutionEnabled && (
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
                              Send locked
                            </span>
                          )}
                        </div>
                        {campaign.goal && (
                          <p className="mt-1 text-xs text-muted">{campaign.goal}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                          {campaign.commentTriggerEnabled && (
                            <span className="rounded bg-surface-hover px-2 py-1">Comment trigger</span>
                          )}
                          {campaign.messageTriggerEnabled && (
                            <span className="rounded bg-surface-hover px-2 py-1">Inbound DM trigger</span>
                          )}
                          <span className="rounded bg-surface-hover px-2 py-1">
                            {campaign.matchAnyWord ? "Any text" : campaign.keywords.join(", ")}
                          </span>
                          <span className="rounded bg-surface-hover px-2 py-1">
                            {campaign._count.matches} durable matches
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editCampaign(campaign)}
                          disabled={!status?.canManage}
                          className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteCampaign(campaign)}
                          disabled={busy === `delete:${campaign.id}` || !status?.canManage}
                          className="rounded border border-error/30 px-3 py-1.5 text-xs text-error disabled:opacity-50"
                        >
                          {busy === `delete:${campaign.id}` ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
