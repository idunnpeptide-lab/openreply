"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Tone = "error" | "warning" | "success";

type HealthAccount = {
  id: string;
  username: string;
  tokenExpiresAt: string | null;
  connected: boolean;
  token: "HEALTHY" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";
  webhookReady: boolean;
  overall: "READY" | "NEEDS_ATTENTION" | "DISCONNECTED";
  reasons: string[];
};

const TONE_CLASSES: Record<Tone, string> = {
  error: "border-error/20 bg-error/10 text-error",
  warning: "border-warning/20 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success",
};

const INSTAGRAM_MESSAGES: Record<
  string,
  { tone: Tone; title: string; detail: string }
> = {
  connected: {
    tone: "success",
    title: "Instagram connected",
    detail:
      "ReplyHalo received the account authorization. Connection health is shown below.",
  },
  denied: {
    tone: "warning",
    title: "Instagram connection cancelled",
    detail:
      "You cancelled the Instagram permission step. Start again and approve the requested access to connect the account.",
  },
  invalid: {
    tone: "error",
    title: "Instagram connection link expired",
    detail:
      "The connection session expired. Click Connect Instagram to start a fresh attempt.",
  },
  forbidden: {
    tone: "error",
    title: "Not permitted",
    detail:
      "Only workspace owners and admins can connect an Instagram account.",
  },
  already_connected: {
    tone: "warning",
    title: "Account already connected",
    detail:
      "That Instagram account is connected to another ReplyHalo workspace. Disconnect it there first, or connect a different account.",
  },
};

const LICENSE_MESSAGES: Record<
  string,
  { tone: Tone; title: string; detail: string }
> = {
  not_found: {
    tone: "error",
    title: "ReplyHalo plan not found",
    detail:
      "The activation key saved for this workspace is not recognized. Check the key issued for this workspace or contact support.",
  },
  not_configured: {
    tone: "warning",
    title: "ReplyHalo plan activation required",
    detail:
      "Activate the ReplyHalo plan for this workspace before connecting Instagram.",
  },
  already_assigned: {
    tone: "warning",
    title: "Activation key already assigned",
    detail:
      "That key belongs to another ReplyHalo workspace. Use the key issued for this workspace.",
  },
  account_migration_required: {
    tone: "warning",
    title: "Connected accounts must be migrated first",
    detail:
      "The workspace plan cannot be changed while social accounts are connected. Contact support for a controlled account migration.",
  },
  suspended: {
    tone: "warning",
    title: "ReplyHalo plan suspended",
    detail:
      "This plan is temporarily suspended. Instagram connections and automated sends are paused until it is reactivated.",
  },
  revoked: {
    tone: "error",
    title: "ReplyHalo plan revoked",
    detail:
      "This plan has been revoked. Contact support before connecting Instagram.",
  },
  expired: {
    tone: "warning",
    title: "ReplyHalo plan expired",
    detail:
      "The plan expiration date has passed. Renew the plan before continuing.",
  },
  account_limit: {
    tone: "warning",
    title: "Connected account limit reached",
    detail:
      "This plan has no free social-account slots. Disconnect an unused account or upgrade the plan.",
  },
  misconfigured: {
    tone: "error",
    title: "ReplyHalo plan service unavailable",
    detail:
      "Plan validation is not available in this environment. Contact support.",
  },
  unavailable: {
    tone: "warning",
    title: "ReplyHalo plan service temporarily unavailable",
    detail:
      "The plan service could not be reached, so no new Instagram connection was created. Try again shortly.",
  },
  failed: {
    tone: "error",
    title: "ReplyHalo plan check failed",
    detail:
      "The workspace plan could not be verified. Try again or contact support.",
  },
};

function HealthPill({
  good,
  label,
}: {
  good: boolean;
  label: string;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
        good
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      }`}
    >
      {good ? "✓ " : "! "}
      {label}
    </span>
  );
}

function tokenLabel(account: HealthAccount) {
  if (account.token === "HEALTHY") return "Authorization healthy";
  if (account.token === "EXPIRING_SOON") return "Authorization expires soon";
  if (account.token === "EXPIRED") return "Authorization expired";
  return "Authorization needs check";
}

function InstagramHealthPanel({ accounts }: { accounts: HealthAccount[] }) {
  if (accounts.length === 0) return null;

  return (
    <section className="rounded border border-border bg-surface/70 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Instagram connection health
          </h2>
          <p className="mt-1 text-xs text-muted">
            ReplyHalo checks connection, authorization, and automation readiness for you.
          </p>
        </div>
        <a
          href="/api/instagram/connect"
          className="inline-flex shrink-0 items-center justify-center rounded bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          Connect / Reconnect Instagram
        </a>
      </div>

      <div className="mt-4 space-y-3">
        {accounts.map((account) => {
          const tokenGood = account.token === "HEALTHY";
          const ready = account.overall === "READY";
          return (
            <article
              key={account.id}
              className={`rounded border p-3.5 ${
                ready
                  ? "border-success/20 bg-success/5"
                  : account.connected
                    ? "border-warning/20 bg-warning/5"
                    : "border-border bg-surface"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    @{account.username}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      ready
                        ? "bg-success/10 text-success"
                        : account.connected
                          ? "bg-warning/10 text-warning"
                          : "bg-zinc-500/10 text-muted"
                    }`}
                  >
                    {ready
                      ? "Ready"
                      : account.connected
                        ? "Needs attention"
                        : "Disconnected"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <HealthPill
                    good={account.connected}
                    label={account.connected ? "Connected" : "Disconnected"}
                  />
                  <HealthPill good={tokenGood} label={tokenLabel(account)} />
                  <HealthPill
                    good={account.webhookReady}
                    label={
                      account.webhookReady
                        ? "Automation ready"
                        : "Automation setup needs attention"
                    }
                  />
                </div>

                {account.tokenExpiresAt && account.connected && (
                  <p className="mt-2 text-[11px] text-muted">
                    Authorization valid until{" "}
                    {new Date(account.tokenExpiresAt).toLocaleDateString()}.
                  </p>
                )}
                {!ready && account.reasons.length > 0 && (
                  <p className="mt-2 text-xs text-muted">
                    {account.reasons[0]}. Reconnecting refreshes authorization; your campaigns, logs, clicks, and history stay saved.
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function InstagramConnectNotice() {
  const searchParams = useSearchParams();
  const [healthAccounts, setHealthAccounts] = useState<HealthAccount[]>([]);

  useEffect(() => {
    fetch("/api/instagram/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setHealthAccounts(payload.data ?? []);
      })
      .catch(() => {});
  }, []);

  const licenseStatus = searchParams.get("license");
  let notice: React.ReactNode = null;

  if (licenseStatus) {
    const knownLicense = LICENSE_MESSAGES[licenseStatus] ?? LICENSE_MESSAGES.failed;
    notice = (
      <Notice tone={knownLicense.tone} title={knownLicense.title}>
        <p>{knownLicense.detail}</p>
      </Notice>
    );
  } else {
    const status = searchParams.get("instagram");

    if (status === "misconfigured") {
      notice = (
        <Notice tone="error" title="Instagram connection temporarily unavailable">
          <p>
            ReplyHalo&apos;s Instagram connection is not fully configured in this environment. You do not need to configure any developer settings yourself. Please contact support.
          </p>
        </Notice>
      );
    } else if (status === "failed") {
      notice = (
        <Notice tone="error" title="Instagram connection failed">
          <p>
            Instagram accepted the login but ReplyHalo could not complete the connection. Try Connect / Reconnect Instagram again. If it repeats, contact support — you will not be asked for your Instagram password or developer credentials.
          </p>
        </Notice>
      );
    } else if (status) {
      const known = INSTAGRAM_MESSAGES[status];
      if (known) {
        notice = (
          <Notice tone={known.tone} title={known.title}>
            <p>{known.detail}</p>
          </Notice>
        );
      }
    }
  }

  if (!notice && healthAccounts.length === 0) return null;

  return (
    <div className="space-y-3">
      {notice}
      <InstagramHealthPanel accounts={healthAccounts} />
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded border p-4 text-sm ${TONE_CLASSES[tone]}`}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 opacity-90">{children}</div>
    </div>
  );
}
