"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Locale, Translations } from "./translations";

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  availableLocales: { code: Locale; label: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const STORAGE_KEY = "targhe-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("it");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && saved in translations) {
      setLocaleState(saved);
    } else {
      // Auto-detect from browser language
      const browserLang = navigator.language.split("-")[0] as Locale;
      if (browserLang in translations) {
        setLocaleState(browserLang);
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        t: translations[locale],
        setLocale,
        availableLocales: LOCALES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
