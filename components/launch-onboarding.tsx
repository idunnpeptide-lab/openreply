"use client";

import { useEffect, useState } from "react";

type HealthAccount = {
  id: string;
  username: string;
  connected: boolean;
  token: "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";
  webhookReady: boolean;
  overall: "READY" | "NEEDS_ATTENTION" | "DISCONNECTED";
  reasons: string[];
};

function Step({
  number,
  title,
  description,
  complete,
}: {
  number: number;
  title: string;
  description: string;
  complete: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          complete
            ? "bg-success/10 text-success"
            : "bg-accent/10 text-accent"
        }`}
      >
        {complete ? "✓" : number}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

export default function LaunchOnboarding({
  connectedAccounts,
  activeAutomations,
}: {
  connectedAccounts: number;
  activeAutomations: number;
}) {
  const [health, setHealth] = useState<HealthAccount[]>([]);

  useEffect(() => {
    fetch("/api/instagram/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setHealth(payload.data ?? []);
      })
      .catch(() => {});
  }, []);

  const needsAttention = health.filter(
    (account) => account.connected && account.overall === "NEEDS_ATTENTION"
  );
  const setupComplete = connectedAccounts > 0 && activeAutomations > 0;

  if (setupComplete && needsAttention.length === 0) return null;

  if (setupComplete && needsAttention.length > 0) {
    const account = needsAttention[0];
    return (
      <section className="rounded-xl border border-warning/30 bg-warning/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              @{account.username} needs attention
            </p>
            <p className="mt-1 text-xs text-muted">
              {account.reasons[0] ?? "Instagram connection needs attention."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/settings"
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Check connection
            </a>
            <a
              href="/api/instagram/connect"
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Reconnect Instagram
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface to-surface p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Get live in a few minutes
          </span>
          <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">
            {connectedAccounts === 0
              ? "Connect Instagram and launch your first automation"
              : "Your Instagram is connected — create your first automation"}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            ReplyHalo keeps the Meta/API setup on our side. You connect your
            professional Instagram account, choose a ready-made automation, and activate it.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {connectedAccounts === 0 ? (
              <a
                href="/api/instagram/connect"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Connect Instagram
              </a>
            ) : (
              <a
                href="/campaigns/quick"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Choose quick automation
              </a>
            )}
            <a
              href="/settings"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Connection settings
            </a>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface/80 p-4 sm:p-5">
          <Step
            number={1}
            title="Connect Instagram"
            description="Authorize your Business or Creator account. No developer setup for the customer."
            complete={connectedAccounts > 0}
          />
          <Step
            number={2}
            title="Choose an automation"
            description="Start from a proven comment-to-DM template instead of building from zero."
            complete={activeAutomations > 0}
          />
          <Step
            number={3}
            title="Activate"
            description="Pick the Reel/post, confirm the keyword and message, then go live."
            complete={activeAutomations > 0}
          />
        </div>
      </div>
    </section>
  );
}
