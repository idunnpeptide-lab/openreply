"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  normalizeLocale,
  translate,
  type ReplyHaloLocale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: ReplyHaloLocale;
  setLocale: (locale: ReplyHaloLocale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: ReplyHaloLocale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<ReplyHaloLocale>(
    normalizeLocale(initialLocale)
  );

  useEffect(() => {
    document.documentElement.lang = locale === "uk" ? "uk" : "en";
  }, [locale]);

  const setLocale = useCallback(
    (next: ReplyHaloLocale) => {
      const normalized = normalizeLocale(next);
      setLocaleState(normalized);
      document.cookie =
        LOCALE_COOKIE +
        "=" +
        normalized +
        "; Path=/; Max-Age=31536000; SameSite=Lax";
      window.localStorage.setItem(LOCALE_COOKIE, normalized);
      document.documentElement.lang = normalized === "uk" ? "uk" : "en";
      router.refresh();
    },
    [router]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string) => translate(locale, key),
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
