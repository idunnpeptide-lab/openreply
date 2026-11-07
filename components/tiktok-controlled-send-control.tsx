"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";

type MatchSummary = {
  id: string;
  automationName: string;
  status: string;
  eventType: string;
  plan: {
    trigger: "COMMENT" | "MESSAGE" | null;
    actionTypes: ("PUBLIC_REPLY" | "DM_REPLY")[];
  };
};

const CONFIRMATION = "EXECUTE_TIKTOK_STAGING_MATCH";

function actionLabel(match: MatchSummary, t: (key: string) => string) {
  const action = match.plan.actionTypes[0];
  if (action === "PUBLIC_REPLY") return t("one public reply");
  if (action === "DM_REPLY") return t("one existing-conversation DM reply");
  return t("stored action");
}

export default function TikTokControlledSendControl({
  canManage,
  liveExecutionEnabled,
  controlledStagingSendEnabled,
  matches,
}: {
  canManage: boolean;
  liveExecutionEnabled: boolean;
  controlledStagingSendEnabled: boolean;
  matches: MatchSummary[];
}) {
  const { t, locale } = useLocale();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  const executionAvailable =
    liveExecutionEnabled && controlledStagingSendEnabled;
  const pendingMatches = matches.filter((match) => match.status === "MATCHED");

  async function executeOnce(match: MatchSummary) {
    const confirmation = window.prompt(
      locale === "uk"
        ? `Контрольоване TikTok staging-відправлення\n\nКампанія: ${match.automationName}\nДія: ${actionLabel(match, t)}\n\nЦя дія навмисно виконується лише один раз і не має автоматичного повтору провайдера. Введіть точно:\n${CONFIRMATION}`
        : `Controlled TikTok staging send\n\nCampaign: ${match.automationName}\nAction: ${actionLabel(match, t)}\n\nThis action is intentionally single-attempt and has no automatic provider retry. Type exactly:\n${CONFIRMATION}`
    );
    if (confirmation !== CONFIRMATION) return;

    setBusyId(match.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        "/api/admin/diagnostics/tiktok-execute-match",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId: match.id,
            confirmation,
          }),
        }
      );
      const payload = await response.json();
      if (!payload.success) {
        setError(t(payload.error ?? "Controlled TikTok execution did not run"));
        return;
      }

      setNotice(
        locale === "uk"
          ? `PASS — контрольовану TikTok-дію один раз виконано для ${match.automationName}. Оновіть діагностику та перевірте результат на стороні провайдера перед будь-якими наступними діями.`
          : `PASS — controlled TikTok action executed once for ${match.automationName}. Refresh diagnostics and verify the provider-side result before doing anything else.`
      );
    } catch {
      setError(t("Could not submit the controlled TikTok staging action"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto panel rounded p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              {t("Controlled TikTok send")}
            </h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                executionAvailable
                  ? "bg-error/10 text-error"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {executionAvailable ? t("Explicit staging approval enabled") : t("Locked")}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {t("This is the prepared one-shot staging boundary for a future approved public reply or existing-conversation DM. It never accepts reply text or provider targets from the browser; it can execute only the durable action already stored by inert routing.")}
          </p>
        </div>
      </div>

      {!executionAvailable ? (
        <div className="mt-4 rounded border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {t("No send action is available. Both source-controlled approval gates remain off. They require a reviewed code change after real OAuth, provider webhook readback, signed-delivery readiness, inert routing/dedupe, and safe reconnect QA pass.")}
        </div>
      ) : pendingMatches.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {t("No pending MATCHED TikTok staging actions are available for a controlled send.")}
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {pendingMatches.map((match) => (
            <div
              key={match.id}
              className="flex flex-col gap-3 rounded border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {match.automationName}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {match.plan.trigger ?? match.eventType} · {actionLabel(match, t)} · {locale === "uk" ? "одна спроба / без автоматичного повтору" : "single attempt / no automatic retry"}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void executeOnce(match)}
                className="rounded border border-error/30 px-3 py-2 text-xs font-medium text-error hover:bg-error/10 disabled:opacity-50"
              >
                {busyId === match.id ? t("Executing…") : t("Execute once")}
              </button>
            </div>
          ))}
        </div>
      )}

      {notice && (
        <div className="mt-4 rounded border border-success/20 bg-success/10 p-3 text-sm text-success">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded border border-error/20 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        {t("Comment-to-Message is not supported by this control. A failed or ambiguous provider call is terminal and must not be retried automatically.")}
      </p>
    </section>
  );
}
