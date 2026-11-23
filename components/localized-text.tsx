"use client";

import { useLocale } from "@/components/locale-provider";

export default function LocalizedText({ text }: { text: string }) {
  const { t } = useLocale();
  return <>{t(text)}</>;
}
