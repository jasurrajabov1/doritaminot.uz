/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  applyUiTranslations,
  getStoredLanguage,
  setStoredLanguage,
} from "./uiTranslations";

const UiLanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  languages: LANGUAGES,
});

export function UiLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);

  const setLanguage = (nextLanguage) => {
    const safeLanguage = LANGUAGES.some((item) => item.code === nextLanguage)
      ? nextLanguage
      : DEFAULT_LANGUAGE;

    setLanguageState(safeLanguage);
    setStoredLanguage(safeLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.body.dataset.uiLanguage = language;

    let rafId = 0;
    let translating = false;

    const run = () => {
      if (translating) return;
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        translating = true;
        applyUiTranslations(document.body, language);
        translating = false;
      });
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "alt"],
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, languages: LANGUAGES }),
    [language],
  );

  return (
    <UiLanguageContext.Provider value={value}>
      {children}
    </UiLanguageContext.Provider>
  );
}

export function useUiLanguage() {
  return useContext(UiLanguageContext);
}

export function LanguageSwitcher() {
  const { language, setLanguage, languages } = useUiLanguage();

  return (
    <label className="app-language-switcher">
      <span>Тил</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label="Тил"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
