"use client";

import Link from "next/link";
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

type LicenseStatus = {
  enabled: boolean;
  configured: boolean;
  valid: boolean | null;
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
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [readinessChecked, setReadinessChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/instagram/health", { cache: "no-store" })
        .then((response) => response.json())
        .catch(() => null),
      fetch("/api/license/status", { cache: "no-store" })
        .then((response) => response.json())
        .catch(() => null),
    ])
      .then(([healthPayload, licensePayload]) => {
        if (cancelled) return;
        if (healthPayload?.success) setHealth(healthPayload.data ?? []);
        if (licensePayload?.success) setLicense(licensePayload.data ?? null);
      })
      .finally(() => {
        if (!cancelled) setReadinessChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const needsAttention = health.filter(
    (account) => account.connected && account.overall === "NEEDS_ATTENTION"
  );
  const setupComplete = connectedAccounts > 0 && activeAutomations > 0;
  const planNeedsActivation =
    license?.enabled === true &&
    (!license.configured || license.valid === false);

  if (setupComplete && needsAttention.length === 0 && !planNeedsActivation) {
    return null;
  }

  if (planNeedsActivation) {
    return (
      <section className="overflow-hidden rounded-2xl border border-warning/30 bg-warning/5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              One step before Instagram
            </span>
            <h2 className="mt-3 text-lg font-bold text-foreground sm:text-xl">
              {license?.configured
                ? "Your ReplyHalo plan needs attention"
                : "Activate your ReplyHalo plan"}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              {license?.configured
                ? "Open Settings to restore your plan before connecting or reconnecting a social account. Your existing automations and history stay saved."
                : "Use the activation code you received with your ReplyHalo access. After activation, you can connect Instagram with one authorization screen."}
            </p>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-lg bg-accent px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {license?.configured ? "Check plan" : "Activate ReplyHalo"}
          </Link>
        </div>
      </section>
    );
  }

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
            <Link
              href="/settings"
              className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Check connection
            </Link>
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
            ReplyHalo handles the technical setup behind the scenes. Connect your
            professional Instagram account, choose a ready-made automation, and activate it.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {connectedAccounts === 0 ? (
              readinessChecked ? (
                <a
                  href="/api/instagram/connect"
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Connect Instagram
                </a>
              ) : (
                <span className="rounded-lg bg-accent/60 px-5 py-2.5 text-sm font-semibold text-white">
                  Checking account…
                </span>
              )
            ) : (
              <Link
                href="/campaigns/quick"
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Choose Quick Automation
              </Link>
            )}
            <Link
              href="/settings"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
            >
              Connection settings
            </Link>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-surface/80 p-4 sm:p-5">
          <Step
            number={1}
            title="Connect Instagram"
            description="Authorize your Business or Creator account in Instagram."
            complete={connectedAccounts > 0}
          />
          <Step
            number={2}
            title="Choose a Quick Automation"
            description="Start from a ready-made comment-to-DM flow instead of building from zero."
            complete={activeAutomations > 0}
          />
          <Step
            number={3}
            title="Activate"
            description="Pick the Reel or post, confirm the keyword and message, then go live."
            complete={activeAutomations > 0}
          />
        </div>
      </div>
    </section>
  );
}
