"use client";

import { useSearchParams } from "next/navigation";

type Tone = "error" | "warning" | "success";

const TONE_CLASSES: Record<Tone, string> = {
  error: "border-error/20 bg-error/10 text-error",
  warning: "border-warning/20 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success",
};

const INSTAGRAM_MESSAGES: Record<
  string,
  { tone: Tone; title: string; detail: string }
> = {
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
      "The configured License Key is not recognized. Check the DM_MAGNET_LICENSE_KEY value and try again.",
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
    title: "DM Magnet license integration is incomplete",
    detail:
      "Set both DM_MAGNET_LICENSE_URL and DM_MAGNET_LICENSE_KEY on the web app and worker, then restart the services.",
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

export function InstagramConnectNotice() {
  const searchParams = useSearchParams();
  const licenseStatus = searchParams.get("license");

  if (licenseStatus) {
    const knownLicense = LICENSE_MESSAGES[licenseStatus] ?? LICENSE_MESSAGES.failed;

    return (
      <Notice tone={knownLicense.tone} title={knownLicense.title}>
        <p>{knownLicense.detail}</p>
      </Notice>
    );
  }

  const status = searchParams.get("instagram");
  if (!status) return null;

  if (status === "misconfigured") {
    const missing = (searchParams.get("missing") ?? "")
      .split(",")
      .filter(Boolean);

    return (
      <Notice tone="error" title="Instagram app not configured">
        <p>
          Set{" "}
          {missing.length > 0
            ? "these environment variables"
            : "the required environment variables"}{" "}
          and restart the server:
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
        <p className="mt-2">
          See <span className="font-mono text-xs">docs/setup.md</span> for how to
          obtain each value. Note that{" "}
          <span className="font-mono text-xs">ENCRYPTION_KEY</span> must be a
          64-character hex string.
        </p>
      </Notice>
    );
  }

  if (status === "failed") {
    const reason = searchParams.get("reason");

    return (
      <Notice tone="error" title="Instagram connection failed">
        <p>
          Instagram accepted the login but the connection could not be
          completed. This is usually a mismatched redirect URI or an app that is
          missing the required permissions.
        </p>
        {reason && (
          <p className="mt-2 font-mono text-xs break-words opacity-80">
            {reason}
          </p>
        )}
      </Notice>
    );
  }

  const known = INSTAGRAM_MESSAGES[status];
  if (!known) return null;

  return (
    <Notice tone={known.tone} title={known.title}>
      <p>{known.detail}</p>
    </Notice>
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
