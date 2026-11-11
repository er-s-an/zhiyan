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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const stored = window.localStorage.getItem("zhiyan.lang.v2");
    const browserLang = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
    const next: Lang = stored === "zh" || stored === "en" ? stored : browserLang;
    setLangState(next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("zhiyan.lang.v2", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
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
