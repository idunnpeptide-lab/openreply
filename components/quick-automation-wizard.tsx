"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import PostPicker from "@/components/post-picker";
import {
  buildQuickAutomationPayload,
  QUICK_AUTOMATION_TEMPLATES,
  type QuickAutomationTemplate,
} from "@/lib/quick-automation-templates";

async function fetchConnectedInstagramAccounts(): Promise<AccountOption[]> {
  const response = await fetch("/api/dashboard/stats", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error("Could not load Instagram accounts");
  }
  return (payload.data.instagramAccounts ?? []) as AccountOption[];
}

export default function QuickAutomationWizard() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    QUICK_AUTOMATION_TEMPLATES[0].id
  );
  const [postId, setPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState(
    QUICK_AUTOMATION_TEMPLATES[0].campaignName
  );
  const [keyword, setKeyword] = useState(QUICK_AUTOMATION_TEMPLATES[0].keyword);
  const [publicReplyMessage, setPublicReplyMessage] = useState(
    QUICK_AUTOMATION_TEMPLATES[0].publicReplyMessage
  );
  const [dmMessage, setDmMessage] = useState(
    QUICK_AUTOMATION_TEMPLATES[0].dmMessage
  );
  const [trackedDestinationUrl, setTrackedDestinationUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const template = useMemo(
    () =>
      QUICK_AUTOMATION_TEMPLATES.find(
        (item) => item.id === selectedTemplateId
      ) ?? QUICK_AUTOMATION_TEMPLATES[0],
    [selectedTemplateId]
  );

  useEffect(() => {
    let cancelled = false;

    fetchConnectedInstagramAccounts()
      .then((next) => {
        if (cancelled) return;
        setAccounts(next);
        setSelectedAccountId(next[0]?.id ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setAccounts([]);
        setSelectedAccountId("");
        setPostId(null);
        setPostUrl(null);
        setAccountsError(
          "ReplyHalo could not load your connected Instagram accounts. Try again before creating an automation."
        );
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function retryAccounts() {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const next = await fetchConnectedInstagramAccounts();
      setAccounts(next);
      setSelectedAccountId((current) =>
        next.some((account) => account.id === current)
          ? current
          : (next[0]?.id ?? "")
      );
    } catch {
      setAccounts([]);
      setSelectedAccountId("");
      setPostId(null);
      setPostUrl(null);
      setAccountsError(
        "ReplyHalo could not load your connected Instagram accounts. Try again before creating an automation."
      );
    } finally {
      setAccountsLoading(false);
    }
  }

  function chooseTemplate(next: QuickAutomationTemplate) {
    setSelectedTemplateId(next.id);
    setCampaignName(next.campaignName);
    setKeyword(next.keyword);
    setPublicReplyMessage(next.publicReplyMessage);
    setDmMessage(next.dmMessage);
    setTrackedDestinationUrl("");
    setError(null);
  }

  function chooseAccount(accountId: string) {
    if (accountId === selectedAccountId) return;
    setSelectedAccountId(accountId);
    setPostId(null);
    setPostUrl(null);
    setError(null);
  }

  async function createAutomation() {
    setError(null);
    if (!selectedAccountId) {
      setError("Connect an Instagram account first.");
      return;
    }
    if (!postId) {
      setError("Choose the post or Reel that should trigger this automation.");
      return;
    }
    if (!campaignName.trim()) {
      setError("Add a campaign name.");
      return;
    }
    if (!keyword.trim()) {
      setError("Add a keyword.");
      return;
    }
    if (!dmMessage.trim()) {
      setError("Add the private message.");
      return;
    }
    if (template.trackedLinkRequired && !trackedDestinationUrl.trim()) {
      setError("Add the HTTPS link you want ReplyHalo to track.");
      return;
    }
    if (template.trackedLinkRequired && !dmMessage.includes("{link}")) {
      setError(
        'Keep the "{link}" token in the private message so ReplyHalo can insert the tracked URL.'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = buildQuickAutomationPayload({
        template,
        instagramAccountId: selectedAccountId,
        postId,
        postUrl,
        campaignName,
        keyword,
        publicReplyMessage,
        dmMessage,
        trackedDestinationUrl,
      });
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error ?? result.message ?? "Could not create automation");
        return;
      }
      router.push("/campaigns");
      router.refresh();
    } catch {
      setError("Could not create automation. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (accountsLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-8 w-56 rounded bg-surface-hover" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-32 rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  if (accountsError) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quick Automations</h1>
          <p className="mt-1 text-sm text-muted">
            We could not verify your connected Instagram accounts yet.
          </p>
        </div>
        <div className="panel rounded-xl p-6">
          <p className="text-sm text-muted">{accountsError}</p>
          <button
            type="button"
            onClick={() => void retryAccounts()}
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quick Automations</h1>
          <p className="mt-1 text-sm text-muted">
            Connect Instagram first, then ReplyHalo can create your first automation in a few steps.
          </p>
        </div>
        <div className="panel rounded-xl p-6">
          <p className="text-sm text-muted">
            You need a connected Instagram Business or Creator account before creating an automation.
          </p>
          <a
            href="/api/instagram/connect"
            className="mt-4 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Connect Instagram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quick Automations</h1>
          <p className="mt-1 text-sm text-muted">
            Start from a ready-made flow, choose the Reel/post, review the text, and activate.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="text-sm font-medium text-accent hover:underline"
        >
          Open full builder
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_AUTOMATION_TEMPLATES.map((item) => {
          const selected = item.id === template.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => chooseTemplate(item)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-accent bg-accent/5"
                  : "border-border bg-surface hover:border-border-hover"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {item.badge}
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
            </button>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel rounded-xl p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">1. Automation details</h2>
          <div className="mt-5 space-y-4">
            <AccountSelect
              accounts={accounts}
              value={selectedAccountId}
              onChange={chooseAccount}
              includeAll={false}
            />

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Campaign name
              </span>
              <input
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                maxLength={100}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Comment keyword
              </span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                maxLength={50}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Public reply
              </span>
              <textarea
                value={publicReplyMessage}
                onChange={(event) => setPublicReplyMessage(event.target.value)}
                rows={2}
                maxLength={1000}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
              />
            </label>

            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Private message
              </span>
              <textarea
                value={dmMessage}
                onChange={(event) => setDmMessage(event.target.value)}
                rows={4}
                maxLength={1000}
                className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
              />
              {template.trackedLinkRequired && (
                <p className="mt-1 text-xs text-muted">
                  Keep <code>{"{link}"}</code> in the message where the tracked link should appear.
                </p>
              )}
            </label>

            {template.trackedLinkRequired && (
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Destination URL
                </span>
                <input
                  type="url"
                  value={trackedDestinationUrl}
                  onChange={(event) => setTrackedDestinationUrl(event.target.value)}
                  placeholder="https://example.com/guide"
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent/40"
                />
              </label>
            )}

            {template.requireFollow && (
              <div className="rounded-lg border border-border bg-surface/70 p-3">
                <p className="text-xs font-semibold text-foreground">Follow Gate included</p>
                <p className="mt-1 text-xs text-muted">{template.followPromptMessage}</p>
              </div>
            )}

            {template.followUpEnabled && (
              <div className="rounded-lg border border-border bg-surface/70 p-3">
                <p className="text-xs font-semibold text-foreground">
                  Follow-up after {template.followUpDelayMinutes} minutes
                </p>
                <p className="mt-1 text-xs text-muted">{template.followUpMessage}</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel rounded-xl p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground">2. Choose the Reel or post</h2>
          <p className="mt-1 text-xs text-muted">
            The automation will listen for the keyword on this content.
          </p>
          <div className="mt-4">
            <PostPicker
              key={selectedAccountId}
              selectedPostId={postId}
              instagramAccountId={selectedAccountId}
              onSelect={(id, url) => {
                setPostId(id);
                setPostUrl(url ?? null);
              }}
            />
          </div>
        </section>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/campaigns"
          className="rounded-lg border border-border px-5 py-2.5 text-center text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => void createAutomation()}
          disabled={saving}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Activating…" : "Activate automation"}
        </button>
      </div>
    </div>
  );
}
