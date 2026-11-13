"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const SCOPES = [
  "Trend Watch: read",
  "Instagram accounts: read",
  "Campaigns: read",
  "Inbox summary: read",
];

export default function McpSettingsCard() {
  const { t } = useLocale();
  const [serverUrl, setServerUrl] = useState("/mcp");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setServerUrl(window.location.origin + "/mcp");
  }, []);

  async function copy() {
    await navigator.clipboard?.writeText(serverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="panel rounded p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("AI & MCP")}</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted">
            {t("Connect your own ChatGPT, Claude, or another MCP-compatible AI. Your AI provider bills its own model usage; ReplyHalo only provides secure workspace tools.")}
          </p>
        </div>
        <span className="w-fit rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
          BYO-AI
        </span>
      </div>

      <div className="mt-5 rounded border border-border bg-surface/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("MCP server URL")}
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <code className="min-w-0 flex-1 overflow-x-auto rounded border border-border bg-background px-3 py-2 text-xs text-foreground">
            {serverUrl}
          </code>
          <button
            type="button"
            onClick={copy}
            className="rounded border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-hover"
          >
            {copied ? t("Copied") : t("Copy")}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground">{t("How it works")}</p>
          <ol className="mt-2 space-y-2 text-xs leading-5 text-muted">
            <li>1. {t("Add this MCP URL in ChatGPT or Claude.")}</li>
            <li>2. {t("Sign in to ReplyHalo with your email.")}</li>
            <li>3. {t("Review the requested read-only permissions and allow access.")}</li>
            <li>4. {t("Ask your AI to work with your ReplyHalo and Trend Watch data.")}</li>
          </ol>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t("Read-only v1 permissions")}</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-muted">
            {SCOPES.map((scope) => (
              <li key={scope}>• {scope}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded border border-success/20 bg-success/5 p-3">
        <p className="text-xs leading-5 text-muted">
          {t("ReplyHalo never sends Instagram access tokens, Meta secrets, database credentials, or license keys to the AI client. Write actions are disabled in MCP v1.")}
        </p>
      </div>
    </section>
  );
}
