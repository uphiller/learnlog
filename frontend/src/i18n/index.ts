import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ko from "./locales/ko.json";

export const LANGUAGE_STORAGE_KEY = "ofme.lang";

export type AppLanguage = "ko" | "en";

function detectLanguage(): AppLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "ko" || stored === "en") return stored;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith("ko") ? "ko" : "en";
}

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}

const initialLanguage = detectLanguage();
syncDocumentLanguage(initialLanguage);

void i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "ko",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  syncDocumentLanguage(language);
});

export default i18n;
