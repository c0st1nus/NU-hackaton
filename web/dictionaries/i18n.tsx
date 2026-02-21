"use client";

import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { en } from "./en";
import { kz } from "./kz";
import { ru } from "./ru";

export type Language = "ru" | "en" | "kz";
export type Dictionary = typeof ru;

const dictionaries: Record<Language, Dictionary> = { ru, en, kz };

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ru");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fire-lang") as Language;
    if (saved && dictionaries[saved]) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("fire-lang", newLang);
    if (typeof window !== "undefined") {
      document.documentElement.lang = newLang;
    }
  };

  // Prevent hydration mismatch by optionally fading in or just rendering russian blindly on server
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ lang: "ru", setLang, t: dictionaries.ru }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
