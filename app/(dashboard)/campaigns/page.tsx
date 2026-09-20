"use client";

/**
 * Campaigns List Page
 *
 * Shows all campaigns as cards with launch-first creation paths, filters,
 * analytics, toggle and delete controls.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { readCache, writeCache } from "@/lib/client-cache";
import { automationMutationCustomerError } from "@/lib/customer-instagram-readiness";

interface Campaign {
  id: string;
  name: string;
  goal: string | null;
  postId: string | null;
  postUrl: string | null;
  pendingNextReel: boolean;
  matchAnyPost: boolean;
  keywords: string[];
  matchAnyWord: boolean;
  dmMessage: string;
  openingDmEnabled: boolean;
  openingDmMessage: string | null;
  openingDmButtonLabel: string | null;
  publicReplyEnabled: boolean;
  publicReplyMessage: string | null;
  publicReplyMessages: string[];
  requireFollow: boolean;
  followPromptMessage: string | null;
  followPromptButtonLabel: string | null;
  isActive: boolean;
  wholeWordMatch: boolean;
  instagramAccountId: string;
  instagramAccount: {
    username: string;
    instagramId: string;
  };
  reportShareSlug: string | null;
  reportShareEnabled: boolean;
  reportUrl: string | null;
  createdAt: string;
  _count: { dmLogs: number };
  trackedLinks: Array<{
    id: string;
    slug: string;
    label: string | null;
    destinationUrl: string;
    trackedUrl: string;
    _count: { clicks: number };
  }>;
  analytics: {
    sent: number;
    skipped: number;
    failed: number;
    clicks: number;
    ctr: number;
    topKeywords: { keyword: string; count: number }[];
  };
}

export default function CampaignsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // postId -> current thumbnail URL, fetched live (Instagram URLs expire, so
  // they are never stored on the campaign).
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  // postId -> video URL for reels, so a campaign thumbnail can play on click.
  const [videos, setVideos] = useState<Record<string, string>>({});
  // The reel currently playing in the lightbox (null when closed).
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    postUrl: string | null;
  } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all"
  );

  const fetchAutomations = useCallback(async () => {
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId !== "all") {
        params.set("instagramAccountId", selectedAccountId);
      }
      const res = await fetch(
        `/api/automations${params.size ? `?${params}` : ""}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error("campaigns_failed");
      }
      setAutomations(data.data);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
      setLoadError("We could not load your automations. Your saved campaigns are not changed.");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetch("/api/dashboard/stats", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error("accounts_failed");
        setAccounts(payload.data.instagramAccounts ?? []);
      })
      .catch(() => {
        setLoadError((current) => current ?? "We could not load the connected Instagram accounts.");
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAutomations();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAutomations]);

  // Fetch fresh post thumbnails (and reel video URLs) for the accounts in view
  // and map them by postId. Cache-first so they show instantly on a return
  // visit. Instagram URLs expire, so they are never stored on the campaign.
  useEffect(() => {
    if (automations.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(
      new Set(automations.map((a) => a.instagramAccountId))
    ).sort();
    const cacheKey = `ig-media:${accountIds.join(",")}`;

    const cached = readCache<{
      thumbs: Record<string, string>;
      videos: Record<string, string>;
    }>(cacheKey, 15 * 60 * 1000);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (cached.data) {
      setThumbnails(cached.data.thumbs);
      setVideos(cached.data.videos);
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.all(
      accountIds.map((accountId) =>
        fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
          .then((res) => res.json())
          .then((payload) =>
            payload.success
              ? (payload.data as {
                  id: string;
                  media_type?: string;
                  media_url?: string;
                  thumbnail_url?: string;
                }[])
              : []
          )
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const thumbs: Record<string, string> = {};
      const vids: Record<string, string> = {};
      for (const list of lists) {
        for (const media of list) {
          const url = media.thumbnail_url ?? media.media_url;
          if (url) thumbs[media.id] = url;
          if (media.media_type === "VIDEO" && media.media_url) {
            vids[media.id] = media.media_url;
          }
        }
      }
      setThumbnails(thumbs);
      setVideos(vids);
      writeCache(cacheKey, { thumbs, videos: vids });
    });

    return () => {
      cancelled = true;
    };
  }, [automations]);

  useEffect(() => {
    if (!playingVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayingVideo(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playingVideo]);

  function handleAccountChange(accountId: string) {
    setLoading(true);
    setLoadError(null);
    setSelectedAccountId(accountId);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        const customerError = automationMutationCustomerError(payload.error);
        setLoadError(
          customerError ?? "That automation could not be updated. Please retry."
        );
        return;
      }
      setLoadError(null);
      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
      );
    } catch {
      setLoadError("That automation could not be updated. Please retry.");
    }
  }

  async function copyReelUrl(auto: Campaign) {
    setMenuOpenId(null);
    if (!auto.postUrl) return;
    try {
      await navigator.clipboard.writeText(auto.postUrl);
      setCopiedId(auto.id);
      window.setTimeout(
        () => setCopiedId((cur) => (cur === auto.id ? null : cur)),
        1500
      );
    } catch (err) {
      console.error("Failed to copy reel URL:", err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error("delete_failed");
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setLoadError("That automation could not be deleted. Please retry.");
    }
  }

  async function duplicateAutomation(auto: Campaign) {
    setMenuOpenId(null);
    const specific = !auto.matchAnyPost && !auto.pendingNextReel;
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${auto.name} copy`,
          instagramAccountId: auto.instagramAccountId,
          postId: specific ? auto.postId : null,
          postUrl: specific ? auto.postUrl : null,
          matchAnyPost: auto.matchAnyPost,
          pendingNextReel: auto.pendingNextReel,
          matchAnyWord: auto.matchAnyWord,
          keywords: auto.keywords,
          dmMessage: auto.dmMessage,
          openingDmEnabled: auto.openingDmEnabled,
          openingDmMessage: auto.openingDmMessage,
          openingDmButtonLabel: auto.openingDmButtonLabel,
          publicReplyEnabled: auto.publicReplyEnabled,
          publicReplyMessages: auto.publicReplyMessages,
          trackedDestinationUrl: auto.trackedLinks[0]?.destinationUrl ?? "",
          secondaryDestinationUrl: auto.trackedLinks[1]?.destinationUrl ?? "",
          secondaryButtonLabel: auto.trackedLinks[1]?.label ?? "Open link",
          requireFollow: auto.requireFollow,
          followPromptMessage: auto.followPromptMessage,
          followPromptButtonLabel: auto.followPromptButtonLabel,
          wholeWordMatch: auto.wholeWordMatch,
          isActive: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("duplicate_failed");
      void fetchAutomations();
    } catch {
      setLoadError("That automation could not be duplicated. Please retry.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="panel h-36 rounded p-6" />
        ))}
      </div>
    );
  }

  const query = search.trim().toLowerCase();
  const filtered = automations.filter((a) => {
    if (statusFilter === "active" && !a.isActive) return false;
    if (statusFilter === "paused" && a.isActive) return false;
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.keywords.some((k) => k.toLowerCase().includes(query)) ||
      a.dmMessage.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="mt-1 text-sm text-muted">
            {filtered.length}
            {filtered.length !== automations.length ? ` of ${automations.length}` : ""}{" "}
            automation{automations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {accounts.length > 1 && (
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
          <Link
            href="/campaigns/import"
            className="flex-1 rounded border border-border px-4 py-2 text-center text-sm font-medium text-muted hover:text-foreground sm:flex-none"
          >
            Import
          </Link>
          <Link
            href="/campaigns/new"
            className="flex-1 rounded border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-surface-hover sm:flex-none"
          >
            Custom builder
          </Link>
          <Link
            href="/campaigns/quick"
            className="flex-1 rounded bg-accent px-4 py-2 text-center text-sm font-semibold text-white hover:bg-accent-hover sm:flex-none"
          >
            Quick Automation
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Something needs attention</p>
            <p className="mt-0.5 text-xs text-muted">{loadError}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchAutomations();
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Retry
            </button>
            <Link
              href="/settings"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Check connection
            </Link>
          </div>
        </div>
      )}

      {automations.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search automations by name, keyword, or message…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none"
          />
          <div className="inline-flex shrink-0 rounded-lg bg-surface p-1">
            {(["all", "active", "paused"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-background font-medium text-foreground ring-1 ring-accent/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {automations.length === 0 && !loadError && (
        <div className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-6 sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Best place to start
            </span>
            <h3 className="mt-3 text-xl font-semibold text-foreground">
              Launch your first automation in a few minutes
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Start with a ready-made Comment → DM, Follow Gate, tracked-link, or follow-up flow. You can still use the full builder when you need something custom.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/campaigns/quick"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Choose Quick Automation
              </Link>
              <Link
                href="/campaigns/new"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
              >
                Build custom automation
              </Link>
            </div>
          </div>
        </div>
      )}

      {automations.length > 0 && filtered.length === 0 && (
        <div className="panel rounded p-8 text-center">
          <p className="text-sm font-medium text-foreground">No automations match these filters</p>
          <p className="mt-1 text-xs text-muted">Clear the search and status filter to see everything again.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((auto) => {
          const videoUrl = auto.postId ? videos[auto.postId] : undefined;
          return (
            <div
              key={auto.id}
              onClick={() => router.push(`/campaigns/${auto.id}`)}
              className="panel cursor-pointer rounded p-4 transition-all hover:border-border-hover"
            >
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                {auto.postId && thumbnails[auto.postId] && (
                  videoUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideo({ url: videoUrl, postUrl: auto.postUrl });
                      }}
                      aria-label="Play reel preview"
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId]}
                        alt="Campaign reel"
                        className="h-12 w-12 rounded border border-border object-cover hover:border-border-hover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                  ) : (
                    <a
                      href={auto.postUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId]}
                        alt="Campaign post"
                        className="h-12 w-12 rounded border border-border object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </a>
                  )
                )}
                <div className="min-w-[12rem] flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{auto.name}</h3>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      @{auto.instagramAccount.username}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        auto.isActive
                          ? "bg-success/10 text-success"
                          : "bg-zinc-500/10 text-muted"
                      }`}
                    >
                      {auto.isActive ? "Active" : "Paused"}
                    </span>
                    {auto.pendingNextReel && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-warning">
                        Waiting for next reel
                      </span>
                    )}
                    {auto.requireFollow && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        Follow gate
                      </span>
                    )}
                    {auto.trackedLinks.length >= 2 && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        2 links
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {auto.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md border border-accent/10 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>

                  <p className="truncate text-sm text-muted">&ldquo;{auto.dmMessage}&rdquo;</p>

                  {auto.trackedLinks[0]?.trackedUrl && (
                    <p className="mt-2 truncate font-mono text-xs text-zinc-500">
                      {auto.trackedLinks[0].trackedUrl}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
                    <span className="font-medium text-foreground">{auto._count.dmLogs} runs</span>
                    <span>·</span>
                    <span>{auto.analytics.sent} sent</span>
                    <span>·</span>
                    <span>{auto.analytics.clicks} clicks</span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{auto.analytics.ctr}% CTR</span>
                    {(auto.analytics.failed > 0 || auto.analytics.skipped > 0) && (
                      <>
                        <span>·</span>
                        <span className={auto.analytics.failed > 0 ? "text-error" : undefined}>
                          {auto.analytics.failed} failed
                        </span>
                        <span>·</span>
                        <span>{auto.analytics.skipped} skipped</span>
                      </>
                    )}
                  </div>

                  {auto.analytics.topKeywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {auto.analytics.topKeywords.map((keyword) => (
                        <span
                          key={keyword.keyword}
                          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted"
                        >
                          {keyword.keyword}: {keyword.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="ml-auto flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {auto.postUrl && (
                    <button
                      onClick={() => void copyReelUrl(auto)}
                      className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
                    >
                      {copiedId === auto.id ? "Copied!" : "Copy URL"}
                    </button>
                  )}
                  <button
                    onClick={() => void toggleActive(auto.id, auto.isActive)}
                    aria-label={auto.isActive ? "Pause automation" : "Activate automation"}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      auto.isActive ? "bg-accent" : "bg-zinc-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        auto.isActive ? "left-6" : "left-1"
                      }`}
                    />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setMenuOpenId((cur) => (cur === auto.id ? null : auto.id))
                      }
                      aria-label="More actions"
                      className="rounded px-2 py-1 text-lg leading-none text-muted hover:text-foreground"
                    >
                      ⋯
                    </button>
                    {menuOpenId === auto.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                          <button
                            onClick={() => void duplicateAutomation(auto)}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpenId(null);
                              void deleteAutomation(auto.id);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative flex max-w-full flex-col items-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 text-sm">
              {playingVideo.postUrl && (
                <a
                  href={playingVideo.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-300 hover:text-white"
                >
                  Open on Instagram
                </a>
              )}
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                className="text-zinc-300 hover:text-white"
              >
                Close
              </button>
            </div>
            <video
              src={playingVideo.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
