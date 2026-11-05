"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

type ManagedEventType = "COMMENT" | "DIRECT_MESSAGE";

type WebhookStatus = {
  eventType: ManagedEventType;
  providerReachable: boolean;
  configured: boolean;
  callbackMatchesExpected: boolean;
  callbackUrl: string | null;
  errorCode: string | null;
};

type WebhookPayload = {
  expectedCallbackUrl: string;
  providerConfigured: boolean;
  missingConfiguration?: string[];
  statuses: WebhookStatus[];
};

function eventLabel(
  eventType: ManagedEventType,
  t: (key: string) => string
) {
  return eventType === "COMMENT"
    ? t("Comment webhook")
    : t("Business Messaging webhook");
}

function statusLabel(
  status: WebhookStatus,
  t: (key: string) => string
) {
  if (status.callbackMatchesExpected) return t("Provider readback matches");
  if (!status.providerReachable) return t("Provider readback unavailable");
  if (status.configured) return t("Different callback configured");
  return t("Not configured");
}

export default function TikTokWebhookStagingControl({
  canManage,
  expectedCallbackUrl,
}: {
  canManage: boolean;
  expectedCallbackUrl: string;
}) {
  const { t, locale } = useLocale();
  const [busy, setBusy] = useState<"read" | "configure" | null>(null);
  const [data, setData] = useState<WebhookPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function readProviderConfiguration() {
    setBusy("read");
    setError(null);
    try {
      const response = await fetch("/api/admin/diagnostics/tiktok-webhooks", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!payload.success) {
        setError(t(payload.error ?? "Could not read TikTok webhook configuration"));
        return;
      }
      setData(payload.data);
    } catch {
      setError(t("Could not read TikTok webhook configuration"));
    } finally {
      setBusy(null);
    }
  }

  async function configureAndVerify() {
    if (
      !window.confirm(
        locale === "uk"
          ? "Налаштувати staging TikTok developer app для надсилання webhook COMMENT і DIRECT_MESSAGE на цей staging callback ReplyHalo? Це не вмикає live reply/DM виконання."
          : "Configure the staging TikTok developer app to send COMMENT and DIRECT_MESSAGE webhooks to this ReplyHalo staging callback? This does not enable live reply/DM execution."
      )
    ) {
      return;
    }

    setBusy("configure");
    setError(null);
    try {
      const response = await fetch("/api/admin/diagnostics/tiktok-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypes: ["COMMENT", "DIRECT_MESSAGE"],
        }),
      });
      const payload = await response.json();
      if (payload.data) setData(payload.data);
      if (!payload.success) {
        setError(
          payload.error ??
            t("TikTok did not confirm the requested webhook configuration")
        );
      }
    } catch {
      setError(t("Could not configure TikTok staging webhooks"));
    } finally {
      setBusy(null);
    }
  }

  const statuses = data?.statuses ?? [];
  const callback = data?.expectedCallbackUrl ?? expectedCallbackUrl;

  return (
    <section className="max-w-6xl mx-auto panel rounded p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {t("TikTok webhook setup")}
            </h2>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              {t("Staging only")}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {t("Read the provider configuration or configure the COMMENT and Business Messaging webhook families without copying app secrets into the browser. Provider readback is separate from runtime webhook readiness.")}
          </p>
          <div className="mt-3 rounded border border-border bg-background/40 p-3">
            <p className="text-xs font-medium text-foreground">{t("Expected callback")}</p>
            <code className="mt-1 block break-all text-xs text-muted">{callback}</code>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void readProviderConfiguration()}
            disabled={busy !== null}
            className="rounded border border-border px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            {busy === "read" ? t("Reading…") : t("Read provider config")}
          </button>
          <button
            type="button"
            onClick={() => void configureAndVerify()}
            disabled={busy !== null}
            className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {busy === "configure" ? t("Configuring…") : t("Configure + verify")}
          </button>
        </div>
      </div>

      {data?.missingConfiguration && data.missingConfiguration.length > 0 && (
        <div className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {t("Missing staging configuration")}: {data.missingConfiguration.join(", ")}
        </div>
      )}

      {statuses.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {statuses.map((status) => (
            <div key={status.eventType} className="rounded border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {eventLabel(status.eventType, t)}
                  </p>
                  <p className="mt-1 text-xs text-muted">{statusLabel(status, t)}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    status.callbackMatchesExpected
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {status.callbackMatchesExpected ? t("Verified") : t("Needs attention")}
                </span>
              </div>
              {status.callbackUrl && (
                <code className="mt-3 block break-all text-xs text-muted">
                  {status.callbackUrl}
                </code>
              )}
              {status.errorCode && (
                <p className="mt-3 text-xs text-error">{t("Provider code")}: {status.errorCode}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {data?.providerConfigured && (
        <div className="mt-4 rounded border border-success/20 bg-success/10 p-3 text-sm text-success">
          {locale === "uk" ? "PASS — provider readback TikTok спрямовує обидва staging webhook-сімейства на очікуваний callback ReplyHalo. Runtime-готовність webhook залишатиметься непідтвердженою, доки ReplyHalo не отримає реальну підписану підтримувану подію." : "PASS — TikTok provider readback points both staging webhook families to the expected ReplyHalo callback. Runtime webhook readiness still stays unconfirmed until a real signed supported event reaches ReplyHalo."}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {locale === "uk" ? "Цей контроль не змінює " : "This control does not change "}<code>TIKTOK_LIVE_EXECUTION_ENABLED</code>{locale === "uk" ? ", не надсилає TikTok reply/DM і самостійно не встановлює готовність webhook акаунта." : ", does not send a TikTok reply/DM, and does not set account webhook readiness by itself."}
      </p>
    </section>
  );
}
