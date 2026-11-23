"use client";

import { localeLabels, type ReplyHaloLocale } from "@/lib/i18n";
import { useLocale } from "@/components/locale-provider";

export default function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={compact ? "block" : "block space-y-2"}>
      {!compact && (
        <span className="block text-sm font-medium text-foreground">
          {t("Interface language")}
        </span>
      )}
      <select
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value as ReplyHaloLocale)
        }
        aria-label={t("Interface language")}
        className={
          compact
            ? "w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground"
            : "w-full rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground"
        }
      >
        {(Object.keys(localeLabels) as ReplyHaloLocale[]).map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
