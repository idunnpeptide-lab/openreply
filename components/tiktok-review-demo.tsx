"use client";

import { useMemo, useState } from "react";
import {
  TIKTOK_REVIEW_DEMO_ACCOUNT,
  TIKTOK_REVIEW_DEMO_NOTICE,
  TIKTOK_REVIEW_DEMO_VIDEOS,
} from "@/lib/tiktok/review-demo";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function TikTokReviewDemo() {
  const [connected, setConnected] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(
    TIKTOK_REVIEW_DEMO_VIDEOS[0].id
  );
  const [keyword, setKeyword] = useState("INFO");
  const [reply, setReply] = useState(
    "Thanks for your comment! More details are available in our profile."
  );
  const [automationSaved, setAutomationSaved] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("2026-10-01T10:00");

  const selectedVideo = useMemo(
    () =>
      TIKTOK_REVIEW_DEMO_VIDEOS.find(
        (video) => video.id === selectedVideoId
      ) ?? TIKTOK_REVIEW_DEMO_VIDEOS[0],
    [selectedVideoId]
  );

  function resetDemo() {
    setConnected(false);
    setSelectedVideoId(TIKTOK_REVIEW_DEMO_VIDEOS[0].id);
    setKeyword("INFO");
    setReply(
      "Thanks for your comment! More details are available in our profile."
    );
    setAutomationSaved(false);
    setScheduleSaved(false);
    setScheduleAt("2026-10-01T10:00");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              TikTok Accounts API — Review Demo
            </h1>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Prototype
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            This staging-only prototype demonstrates how ReplyHalo plans to use
            TikTok Accounts API permissions for authorized account connection,
            owned-content access, comment automation, scheduled publishing, and
            account/content analytics.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDemo}
          className="rounded border border-border px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
        >
          Reset demo
        </button>
      </div>

      <div className="rounded border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        <strong>Important:</strong> {TIKTOK_REVIEW_DEMO_NOTICE}
      </div>

      <section className="panel rounded p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Step 1
            </p>
            <h2 className="mt-1 text-base font-semibold">
              Connect an authorized TikTok account
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              In production, ReplyHalo will use OAuth so each customer explicitly
              authorizes access to their own TikTok account.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              connected
                ? "bg-success/10 text-success"
                : "bg-zinc-500/10 text-muted"
            }`}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>

        {!connected ? (
          <button
            type="button"
            onClick={() => setConnected(true)}
            className="mt-5 rounded bg-foreground px-4 py-2.5 text-sm font-medium text-background"
          >
            Connect TikTok account (prototype)
          </button>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-border bg-surface/70 p-4 sm:col-span-2">
              <p className="text-xs text-muted">Authorized account</p>
              <p className="mt-1 text-base font-semibold">
                @{TIKTOK_REVIEW_DEMO_ACCOUNT.username}
              </p>
              <p className="text-sm text-muted">
                {TIKTOK_REVIEW_DEMO_ACCOUNT.displayName}
              </p>
            </div>
            <div className="rounded border border-border bg-surface/70 p-4">
              <p className="text-xs text-muted">Planned access</p>
              <p className="mt-1 text-sm font-medium">Owned content + comments</p>
              <p className="mt-1 text-xs text-muted">
                Only after account-holder authorization.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Step 2
        </p>
        <h2 className="mt-1 text-base font-semibold">Select owned content</h2>
        <p className="mt-1 text-sm text-muted">
          ReplyHalo retrieves content belonging to the authorized account so the
          user can choose where an automation should apply.
        </p>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {TIKTOK_REVIEW_DEMO_VIDEOS.map((video) => {
            const selected = selectedVideoId === video.id;
            return (
              <button
                key={video.id}
                type="button"
                disabled={!connected}
                onClick={() => setSelectedVideoId(video.id)}
                className={`rounded border p-4 text-left transition ${
                  selected
                    ? "border-foreground bg-surface-hover"
                    : "border-border bg-surface/70"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{video.title}</p>
                  <span className="text-xs text-muted">
                    {selected ? "Selected" : "Select"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
                  <span>{formatNumber(video.views)} views</span>
                  <span>{formatNumber(video.comments)} comments</span>
                  <span>{formatNumber(video.likes)} likes</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Step 3
        </p>
        <h2 className="mt-1 text-base font-semibold">
          Configure comment automation
        </h2>
        <p className="mt-1 text-sm text-muted">
          The account owner defines the keyword and public reply. ReplyHalo will
          process eligible comments only for the authorized account and selected
          owned content.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Keyword</span>
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setAutomationSaved(false);
              }}
              disabled={!connected}
              className="w-full rounded border border-border bg-background px-3 py-2 text-foreground disabled:opacity-50"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Owned video</span>
            <input
              value={selectedVideo.title}
              readOnly
              disabled={!connected}
              className="w-full rounded border border-border bg-surface px-3 py-2 text-muted disabled:opacity-50"
            />
          </label>
          <label className="block text-sm lg:col-span-2">
            <span className="mb-1.5 block font-medium">Public reply</span>
            <textarea
              value={reply}
              onChange={(event) => {
                setReply(event.target.value.slice(0, 150));
                setAutomationSaved(false);
              }}
              disabled={!connected}
              rows={3}
              className="w-full rounded border border-border bg-background px-3 py-2 text-foreground disabled:opacity-50"
            />
            <span className="mt-1 block text-xs text-muted">
              {reply.length}/150 characters
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!connected || !keyword.trim() || !reply.trim()}
            onClick={() => setAutomationSaved(true)}
            className="rounded bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save automation (prototype)
          </button>
          {automationSaved && (
            <span className="rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
              Automation ready — no provider action sent
            </span>
          )}
        </div>
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Planned Accounts API feature
            </p>
            <h2 className="mt-1 text-base font-semibold">Scheduled publishing</h2>
            <p className="mt-1 text-sm text-muted">
              ReplyHalo will let an authorized account owner choose content and a
              publish time. ReplyHalo's scheduler will call the provider only at
              the user-selected time and only for that authorized account.
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            Prototype only
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">Schedule time</span>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => {
                setScheduleAt(event.target.value);
                setScheduleSaved(false);
              }}
              disabled={!connected}
              className="w-full rounded border border-border bg-background px-3 py-2 text-foreground disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            disabled={!connected || !scheduleAt}
            onClick={() => setScheduleSaved(true)}
            className="rounded border border-border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            Schedule (prototype)
          </button>
        </div>
        {scheduleSaved && (
          <p className="mt-3 text-xs font-medium text-success">
            Schedule preview saved locally. No TikTok publish request was sent.
          </p>
        )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Planned Accounts API feature
            </p>
            <h2 className="mt-1 text-base font-semibold">
              Account and content analytics
            </h2>
            <p className="mt-1 text-sm text-muted">
              A future analytics view will summarize performance data returned
              for the authorized account and its owned content.
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
            Demo data
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-border bg-surface/70 p-4">
            <p className="text-xs text-muted">Views</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(selectedVideo.views)}
            </p>
          </div>
          <div className="rounded border border-border bg-surface/70 p-4">
            <p className="text-xs text-muted">Comments</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(selectedVideo.comments)}
            </p>
          </div>
          <div className="rounded border border-border bg-surface/70 p-4">
            <p className="text-xs text-muted">Likes</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(selectedVideo.likes)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
