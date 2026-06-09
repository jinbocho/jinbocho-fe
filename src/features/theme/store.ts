import { create } from "zustand";

export type ThemePref = "light" | "dark" | "system";

const STORAGE_KEY = "jinbocho.theme";

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolve(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref;
}

/** Apply the resolved theme to <html> by toggling the `dark` class. */
function apply(pref: ThemePref): void {
  document.documentElement.classList.toggle("dark", resolve(pref) === "dark");
}

function readStored(): ThemePref {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  pref: readStored(),
  setPref: (pref) => {
    localStorage.setItem(STORAGE_KEY, pref);
    apply(pref);
    set({ pref });
  },
}));

/**
 * Call once, synchronously, before React renders to avoid a flash of the wrong
 * theme. Also keeps "system" preference in sync with OS changes.
 */
export function initTheme(): void {
  const pref = readStored();
  apply(pref);
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().pref === "system") apply("system");
  });
}
