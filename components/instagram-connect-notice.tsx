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
      "You declined the permission prompt on Instagram. Start again and accept all requested permissions.",
  },
  invalid: {
    tone: "error",
    title: "Instagram connection expired",
    detail:
      "The login link was missing or older than 10 minutes. Click Connect Instagram to start a fresh attempt.",
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
      "That Instagram account is connected to another workspace. Disconnect it there first, or connect a different account.",
  },
};

const LICENSE_MESSAGES: Record<
  string,
  { tone: Tone; title: string; detail: string }
> = {
  not_found: {
    tone: "error",
    title: "DM Magnet license not found",
    detail:
      "The License Key saved for this workspace is not recognized. Open Settings and enter the correct customer License Key.",
  },
  not_configured: {
    tone: "warning",
    title: "DM Magnet License Key required",
    detail:
      "This workspace does not have a License Key yet. Open Settings, activate the customer license, then connect Instagram.",
  },
  already_assigned: {
    tone: "warning",
    title: "License Key already assigned",
    detail:
      "That License Key belongs to another workspace in this DM Magnet SaaS. Use the key issued for this workspace.",
  },
  account_migration_required: {
    tone: "warning",
    title: "Connected accounts must be migrated first",
    detail:
      "A workspace License Key cannot be changed while social accounts are connected. Contact support for a controlled account migration or reset.",
  },
  suspended: {
    tone: "warning",
    title: "DM Magnet license suspended",
    detail:
      "This license is temporarily suspended. Instagram connections and automated sends are paused until it is reactivated.",
  },
  revoked: {
    tone: "error",
    title: "DM Magnet license revoked",
    detail:
      "This license has been revoked. Contact the license administrator before connecting Instagram.",
  },
  expired: {
    tone: "warning",
    title: "DM Magnet license expired",
    detail:
      "The license expiration date has passed. Renew or replace the License Key before continuing.",
  },
  account_limit: {
    tone: "warning",
    title: "Instagram account limit reached",
    detail:
      "This License Key has no free Instagram account slots. Reset an old binding or use a plan with more account slots.",
  },
  misconfigured: {
    tone: "error",
    title: "DM Magnet license service is not configured",
    detail:
      "The shared SaaS deployment is missing DM_MAGNET_LICENSE_URL. Contact the service administrator.",
  },
  unavailable: {
    tone: "warning",
    title: "DM Magnet License Server unavailable",
    detail:
      "The license service could not be reached. No new Instagram connection was created. Try again when the service is available.",
  },
  failed: {
    tone: "error",
    title: "DM Magnet license check failed",
    detail:
      "The license could not be verified. Check the service configuration and operational logs.",
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
            ReplyHalo checks the connection, authorization lifetime, and automation webhook for you.
          </p>
        </div>
        <a
          href="/api/instagram/connect"
          className="inline-flex shrink-0 items-center justify-center rounded bg-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-hover"
        >
          Reconnect Instagram
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                      {account.reasons[0]}. Reconnecting refreshes authorization; your campaigns and history stay saved.
                    </p>
                  )}
                </div>
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
      const missing = (searchParams.get("missing") ?? "")
        .split(",")
        .filter(Boolean);
      notice = (
        <Notice tone="error" title="Instagram app not configured">
          <p>
            The ReplyHalo Instagram app is not fully configured in this environment.
            Customers should never need to supply these developer credentials themselves.
          </p>
          {missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {missing.map((name) => (
                <li key={name} className="font-mono text-xs">
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Notice>
      );
    } else if (status === "failed") {
      const reason = searchParams.get("reason");
      notice = (
        <Notice tone="error" title="Instagram connection failed">
          <p>
            Instagram accepted the login but ReplyHalo could not complete the connection. Try Reconnect Instagram. If it repeats, support can review the provider configuration without asking for your password.
          </p>
          {reason && (
            <p className="mt-2 font-mono text-xs break-words opacity-80">
              {reason}
            </p>
          )}
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
