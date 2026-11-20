"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { t as translate } from "../../lib/v2/i18n";
import type { Lang } from "../../lib/v2/types";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => undefined,
  t: (key: string) => translate("zh", key),
});

function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "fr" || value === "ja" || value === "ru" || value === "ko";
}

function htmlLang(lang: Lang): string {
  return lang === "zh" ? "zh-CN" : lang;
}

function browserLang(): Lang {
  const value = navigator.language?.toLowerCase() ?? "";
  if (value.startsWith("zh")) return "zh";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("ja")) return "ja";
  if (value.startsWith("ru")) return "ru";
  if (value.startsWith("ko")) return "ko";
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const stored = window.localStorage.getItem("zhiyan.lang.v2");
    const next: Lang = isLang(stored) ? stored : browserLang();
    setLangState(next);
    document.documentElement.lang = htmlLang(next);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("zhiyan.lang.v2", next);
    document.documentElement.lang = htmlLang(next);
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: (key: string) => translate(lang, key) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
