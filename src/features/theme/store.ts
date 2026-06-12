import { create } from "zustand";

export type ThemeName = "pergamena" | "akabeni" | "sumi";
export type ThemePref = "light" | "dark" | "system";

const STORAGE_KEY_MODE = "jinbocho.theme";
const STORAGE_KEY_NAME = "jinbocho.theme-name";

const THEME_NAMES: ThemeName[] = ["pergamena", "akabeni", "sumi"];

function systemPrefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function resolveMode(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref;
}

function apply(name: ThemeName, pref: ThemePref): void {
  const html = document.documentElement;
  // Remove all theme-* classes, then add the active one (skip for pergamena — it's :root default)
  for (const n of THEME_NAMES) html.classList.remove(`theme-${n}`);
  if (name !== "pergamena") html.classList.add(`theme-${name}`);
  html.classList.toggle("dark", resolveMode(pref) === "dark");
}

function readStoredMode(): ThemePref {
  const v = localStorage.getItem(STORAGE_KEY_MODE);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function readStoredName(): ThemeName {
  const v = localStorage.getItem(STORAGE_KEY_NAME);
  return v === "akabeni" || v === "sumi" ? v : "pergamena";
}

interface ThemeState {
  name: ThemeName;
  pref: ThemePref;
  setName: (name: ThemeName) => void;
  setPref: (pref: ThemePref) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  name: readStoredName(),
  pref: readStoredMode(),
  setName: (name) => {
    localStorage.setItem(STORAGE_KEY_NAME, name);
    apply(name, get().pref);
    set({ name });
  },
  setPref: (pref) => {
    localStorage.setItem(STORAGE_KEY_MODE, pref);
    apply(get().name, pref);
    set({ pref });
  },
}));

/**
 * Call once synchronously before React renders to avoid a flash of the wrong
 * theme. Also keeps "system" preference in sync with OS changes.
 */
export function initTheme(): void {
  const name = readStoredName();
  const pref = readStoredMode();
  apply(name, pref);
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const s = useThemeStore.getState();
    if (s.pref === "system") apply(s.name, "system");
  });
}
