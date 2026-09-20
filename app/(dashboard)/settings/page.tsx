"use client";

import { Suspense, useEffect, useState } from "react";
import type { AccountOption } from "@/components/account-select";
import { InstagramConnectNotice } from "@/components/instagram-connect-notice";
import {
  accountLimitRecoveryMessage,
  instagramDisconnectCustomerError,
} from "@/lib/customer-settings-recovery";

interface SettingsData {
  workspace: {
    name: string;
    dmsSentThisPeriod: number;
  };
  instagramAccount: {
    id: string;
    username: string;
    instagramId: string;
    tokenExpiresAt: string | null;
    webhookSubscribed: boolean;
  } | null;
  instagramAccounts: Array<
    AccountOption & {
      tokenExpiresAt: string | null;
      webhookSubscribed: boolean;
    }
  >;
}

interface LicenseStatusData {
  enabled: boolean;
  configured: boolean;
  keyPrefix?: string | null;
  valid: boolean | null;
  plan?: "SOLO" | "CREATOR" | "AGENCY" | null;
  status?: string | null;
  maxAccounts?: number | null;
  usedAccounts?: number | null;
  availableAccounts?: number | null;
  expiresAt?: string | null;
  error?: string;
}

interface WorkspaceMembersData {
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    inviteUrl: string;
    expiresAt: string;
  }>;
}

function planAttentionMessage(error?: string) {
  switch (error) {
    case "LICENSE_SUSPENDED":
      return "Your ReplyHalo plan is temporarily paused. Contact support or restore the plan before connecting another account.";
    case "LICENSE_REVOKED":
      return "This ReplyHalo access is no longer active. Contact support before continuing.";
    case "LICENSE_EXPIRED":
      return "Your ReplyHalo plan has expired. Renew your access before connecting another account.";
    case "ACCOUNT_LIMIT_REACHED":
      return accountLimitRecoveryMessage();
    case "LICENSE_NOT_FOUND":
    case "LICENSE_SECRET_INVALID":
      return "We could not verify the saved activation code. Enter the code issued for this ReplyHalo workspace again.";
    case "LICENSE_SERVICE_UNAVAILABLE":
      return "ReplyHalo could not verify your plan right now. Your saved data is safe; please try again in a moment.";
    default:
      return "We could not verify this ReplyHalo plan. Retry the activation code or contact support.";
  }
}

function activationErrorMessage(error?: string) {
  switch (error) {
    case "LICENSE_NOT_FOUND":
      return "That activation code was not recognized. Check the code and try again.";
    case "LICENSE_ALREADY_ASSIGNED":
      return "That activation code is already linked to another ReplyHalo workspace.";
    case "LICENSE_ACCOUNT_MIGRATION_REQUIRED":
      return "This workspace already has connected social accounts. Contact support before moving it to a different plan.";
    case "LICENSE_SUSPENDED":
      return "This ReplyHalo plan is temporarily paused. Contact support before continuing.";
    case "LICENSE_REVOKED":
      return "This ReplyHalo access is no longer active. Contact support before continuing.";
    case "LICENSE_EXPIRED":
      return "This ReplyHalo plan has expired. Renew your access and try again.";
    case "ACCOUNT_LIMIT_REACHED":
      return "This plan has no free social-account slots.";
    case "LICENSE_SERVICE_UNAVAILABLE":
      return "ReplyHalo could not verify the plan right now. Please try again in a moment.";
    default:
      return "We could not activate ReplyHalo with that code. Check it and try again, or contact support.";
  }
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [membersData, setMembersData] = useState<WorkspaceMembersData | null>(
    null
  );
  const [licenseData, setLicenseData] = useState<LicenseStatusData | null>(null);
  const [licenseLoadError, setLicenseLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [instagramError, setInstagramError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/workspace/members").then((res) => res.json()),
      fetch("/api/license/status", { cache: "no-store" }).then((res) =>
        res.json()
      ),
    ]).then(([statsResult, membersResult, licenseResult]) => {
      if (
        statsResult.status === "fulfilled" &&
        statsResult.value?.success
      ) {
        setData(statsResult.value.data);
      }

      if (
        membersResult.status === "fulfilled" &&
        membersResult.value?.success
      ) {
        setMembersData(membersResult.value.data);
      }

      if (
        licenseResult.status === "fulfilled" &&
        licenseResult.value?.success
      ) {
        setLicenseData(licenseResult.value.data);
        setLicenseLoadError(false);
      } else {
        setLicenseLoadError(true);
      }

      setLoading(false);
    });
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/workspace/members");
    const payload = await res.json();
    if (payload.success) setMembersData(payload.data);
  }

  async function refreshLicenseStatus() {
    setBusy("license-refresh");
    setLicenseError(null);

    try {
      const res = await fetch("/api/license/status", { cache: "no-store" });
      const payload = await res.json();

      if (!payload.success) {
        setLicenseLoadError(true);
        return;
      }

      setLicenseData(payload.data);
      setLicenseLoadError(false);
    } catch {
      setLicenseLoadError(true);
    } finally {
      setBusy(null);
    }
  }

  async function configureLicense(event: React.FormEvent) {
    event.preventDefault();
    setLicenseError(null);
    setBusy("license");

    try {
      const res = await fetch("/api/license/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: licenseKeyInput }),
      });
      const payload = await res.json();

      if (payload.success) {
        setLicenseData(payload.data);
        setLicenseLoadError(false);
        setLicenseKeyInput("");
      } else {
        setLicenseError(activationErrorMessage(payload.error));
      }
    } catch {
      setLicenseError(
        "ReplyHalo could not verify the activation code right now. Please try again."
      );
    } finally {
      setBusy(null);
    }
  }

  async function disconnectInstagram(instagramAccountId: string) {
    if (
      !confirm(
        "Disconnect Instagram? Campaigns will stop sending until you reconnect. Campaigns, logs, clicks, and history are preserved."
      )
    ) {
      return;
    }

    const busyKey = `disconnect:${instagramAccountId}`;
    setBusy(busyKey);
    setInstagramError(null);

    try {
      const response = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramAccountId }),
      });
      const payload = await response.json();
      const customerError = instagramDisconnectCustomerError(
        response.ok,
        payload?.success
      );

      if (customerError) {
        setInstagramError(customerError);
        return;
      }

      window.location.reload();
    } catch {
      setInstagramError(instagramDisconnectCustomerError(false, undefined));
    } finally {
      setBusy((current) => (current === busyKey ? null : current));
    }
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setMemberError(null);
    setBusy("invite");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const payload = await res.json();
    if (payload.success) {
      setMembersData(payload.data);
      setInviteEmail("");
    } else {
      setMemberError(payload.error ?? "Could not invite member");
    }
    setBusy(null);
  }

  async function removeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`);
    await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    await refreshMembers();
    setBusy(null);
  }

  if (loading) {
    return <div className="panel rounded p-8 h-64" />;
  }

  const accounts = data?.instagramAccounts ?? [];
  const canManageMembers =
    membersData?.currentUserRole === "OWNER" ||
    membersData?.currentUserRole === "ADMIN";
  const planReadyForInstagram =
    !licenseLoadError &&
    licenseData !== null &&
    (licenseData.enabled === false ||
      (licenseData.configured && licenseData.valid === true));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Suspense fallback={null}>
        <InstagramConnectNotice />
      </Suspense>

      <section className="panel rounded p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">ReplyHalo Plan</h2>
            <p className="mt-1 text-xs text-muted">
              Your plan controls how many social accounts can be connected to this workspace.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              licenseLoadError
                ? "bg-warning/10 text-warning"
                : licenseData?.enabled &&
                    licenseData.configured &&
                    licenseData.valid
                  ? "bg-success/10 text-success"
                  : licenseData?.enabled
                    ? licenseData.configured
                      ? "bg-error/10 text-error"
                      : "bg-warning/10 text-warning"
                    : "bg-zinc-500/10 text-muted"
            }`}
          >
            {licenseLoadError
              ? "Check required"
              : !licenseData?.enabled
                ? "Local mode"
                : !licenseData.configured
                  ? "Activation required"
                  : licenseData.valid
                    ? "Active"
                    : "Needs attention"}
          </span>
        </div>

        {licenseLoadError ? (
          <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-sm font-medium text-foreground">
              We could not verify your ReplyHalo plan
            </p>
            <p className="mt-1 text-xs text-muted">
              Your saved data is safe. Check the plan again before connecting or reconnecting a social account.
            </p>
            <button
              type="button"
              onClick={refreshLicenseStatus}
              disabled={busy === "license-refresh"}
              className="mt-3 rounded border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50"
            >
              {busy === "license-refresh" ? "Checking..." : "Check plan"}
            </button>
          </div>
        ) : !licenseData?.enabled ? (
          <p className="mt-4 text-sm text-muted">
            Plan activation is not required in this environment.
          </p>
        ) : licenseData.configured && licenseData.valid ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded border border-border bg-surface/70 p-3">
                <p className="text-xs text-muted">Plan</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {licenseData.plan}
                </p>
              </div>
              <div className="rounded border border-border bg-surface/70 p-3">
                <p className="text-xs text-muted">Connected account slots</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {licenseData.usedAccounts}/{licenseData.maxAccounts}
                </p>
              </div>
              <div className="rounded border border-border bg-surface/70 p-3">
                <p className="text-xs text-muted">Plan renewal</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {licenseData.expiresAt
                    ? new Date(licenseData.expiresAt).toLocaleDateString()
                    : "No expiry"}
                </p>
              </div>
            </div>
            {licenseData.keyPrefix && (
              <p className="mt-3 text-xs text-muted">
                Activation code: {licenseData.keyPrefix}
              </p>
            )}
          </>
        ) : licenseData.configured ? (
          <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-sm font-medium text-foreground">Your plan needs attention</p>
            <p className="mt-1 text-xs text-muted">
              {planAttentionMessage(licenseData.error)}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium text-foreground">Activate your ReplyHalo access</p>
            <p className="mt-1 text-xs text-muted">
              Paste the activation code you received with your plan. You only need to do this once for this workspace.
            </p>
          </div>
        )}

        {!licenseLoadError &&
          licenseData?.enabled &&
          canManageMembers &&
          (!licenseData.configured || accounts.length === 0) && (
            <form
              onSubmit={configureLicense}
              className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row"
            >
              <input
                type="password"
                value={licenseKeyInput}
                onChange={(event) => setLicenseKeyInput(event.target.value)}
                placeholder={
                  licenseData.configured
                    ? "Re-enter or replace your activation code"
                    : "Paste your ReplyHalo activation code"
                }
                aria-label="ReplyHalo activation code"
                className="min-w-0 flex-1 rounded border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/40"
                autoComplete="off"
                required
              />
              <button
                type="submit"
                disabled={busy === "license"}
                className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {busy === "license"
                  ? "Checking..."
                  : licenseData.configured
                    ? "Update code"
                    : "Activate ReplyHalo"}
              </button>
              {licenseError && (
                <p className="sm:basis-full text-sm text-error">
                  {licenseError}
                </p>
              )}
            </form>
          )}

        {!licenseLoadError &&
          licenseData?.enabled &&
          licenseData.configured &&
          accounts.length > 0 &&
          canManageMembers && (
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted">
              Your activation code is protected while social accounts are connected.
              Contact support if you need to move this workspace to a different plan.
            </p>
          )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-6">Instagram</h2>

        {instagramError && (
          <div className="mb-4 rounded-lg border border-error/20 bg-error/5 p-3">
            <p className="text-sm font-medium text-error">Could not disconnect Instagram</p>
            <p className="mt-1 text-xs text-muted">{instagramError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Status</p>
              <p className="text-xs text-muted mt-0.5">
                Comment automation and private replies depend on this connection.
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                accounts.length > 0
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {accounts.length > 0 ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Accounts</p>
              <p className="text-xs text-muted mt-0.5">
                {accounts.length} connected Instagram profile
                {accounts.length === 1 ? "" : "s"}
              </p>
            </div>
            <span className="text-sm text-muted">
              {accounts.length > 0 ? `${accounts.length} connected` : "None"}
            </span>
          </div>

          <div className="space-y-3 py-3">
            {accounts.length === 0 && (
              <p className="text-sm text-muted">
                Connect an Instagram professional account to launch automations.
              </p>
            )}
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded border border-border bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    @{account.username}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Connection valid until{" "}
                    {account.tokenExpiresAt
                      ? new Date(account.tokenExpiresAt).toLocaleDateString()
                      : "not available"}{" "}
                    · {account.webhookSubscribed ? "Automation ready" : "Finishing setup"}
                  </p>
                </div>
                <button
                  onClick={() => disconnectInstagram(account.id)}
                  disabled={busy === `disconnect:${account.id}`}
                  className="inline-flex items-center justify-center rounded border border-error/20 px-4 py-2 text-sm font-medium text-error transition-all hover:border-error/40 hover:bg-error/10 disabled:opacity-50"
                >
                  {busy === `disconnect:${account.id}`
                    ? "Disconnecting..."
                    : "Disconnect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex gap-3">
          {planReadyForInstagram ? (
            <a
              href="/api/instagram/connect"
              className="px-4 py-2 rounded text-sm font-medium transition-colors bg-accent text-white hover:bg-accent-hover"
            >
              {accounts.length > 0 ? "Connect another account" : "Connect Instagram"}
            </a>
          ) : (
            <span className="px-4 py-2 rounded text-sm font-medium bg-zinc-500/10 text-muted">
              Check your ReplyHalo plan before connecting Instagram
            </span>
          )}
        </div>
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-6">Team</h2>
        <div className="space-y-3">
          {membersData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.user.name ?? member.user.email ?? "Unknown member"}
                </p>
                <p className="text-xs text-muted">{member.user.email}</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                {member.role}
              </span>
            </div>
          ))}
        </div>

        {membersData?.invitations.length ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Pending invites
            </p>
            <div className="space-y-3">
              {membersData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded border border-border bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {invitation.role} · {invitation.inviteUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard?.writeText(invitation.inviteUrl)
                      }
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-foreground"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.id)}
                      disabled={busy === `invite:${invitation.id}`}
                      className="rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManageMembers && (
          <form
            onSubmit={inviteMember}
            className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="teammate@example.com"
              className="rounded border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/40"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) =>
                setInviteRole(event.target.value as "ADMIN" | "MEMBER")
              }
              className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent/40"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button
              type="submit"
              disabled={busy === "invite"}
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy === "invite" ? "Inviting..." : "Invite"}
            </button>
            {memberError && (
              <p className="sm:col-span-3 text-sm text-error">{memberError}</p>
            )}
          </form>
        )}
      </section>

      <section className="panel rounded p-4 sm:p-6">
        <h2 className="text-base font-semibold mb-6">Usage</h2>
        <div className="flex items-center justify-between gap-3 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              DMs sent this month
            </p>
            <p className="text-xs text-muted mt-0.5">
              Automated DMs recorded for this workspace.
            </p>
          </div>
          <span className="text-sm font-semibold text-foreground">
            {data?.workspace.dmsSentThisPeriod ?? 0}
          </span>
        </div>
      </section>
    </div>
  );
}
