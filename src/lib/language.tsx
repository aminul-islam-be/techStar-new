"use client";

import { useSite } from "@/lib/siteContext";
import { DEFAULT_SITE_NAME } from "@/lib/siteDefaults";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  translations,
  type Language,
} from "./i18n";

export type { Language };

// "TechStar" inside a translation is swapped for the website name set in Admin -> Website settings
function withSiteName(text: string, name: string) {
  if (name === DEFAULT_SITE_NAME) return text;
  return text.split(DEFAULT_SITE_NAME).join(name).split("টেকস্টার").join(name);
}

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  // English is ALWAYS the default for every country/user, until changed manually.
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const site = useSite();

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (saved === "en" || saved === "bn") {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (value: Language) => {
    setLanguageState(value);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "bn" : "en");
  };

  const t = (key: string): string => {
    const text = translations[language][key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
    return withSiteName(text, site.siteName);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, site.siteName]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
