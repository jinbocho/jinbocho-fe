import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";

export const SUPPORTED_LANGS = ["en", "it", "es", "fr"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
    es: { translation: es },
    fr: { translation: fr },
  },
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
