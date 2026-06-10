import { create } from "zustand";

import i18n, { Lang, SUPPORTED_LANGS } from "./config";

const STORAGE_KEY = "jinbocho.lang";

function readStored(): Lang {
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && (SUPPORTED_LANGS as readonly string[]).includes(v)) return v as Lang;
  const nav = navigator.language.slice(0, 2);
  if ((SUPPORTED_LANGS as readonly string[]).includes(nav)) return nav as Lang;
  return "en";
}

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: readStored(),
  setLang: (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    void i18n.changeLanguage(lang);
    set({ lang });
  },
}));

/** Call once synchronously before React renders to avoid a language flash. */
export function initI18n(): void {
  const lang = readStored();
  void i18n.changeLanguage(lang);
}
