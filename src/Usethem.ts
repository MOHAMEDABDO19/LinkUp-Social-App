import { useSyncExternalStore } from "react";
import "./assets/theme.css";

export type Theme = "dark" | "light";

const KEY = "theme";
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

let current: Theme = read();

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
}
// applied as soon as this file is imported, so the page doesn't flash
apply(current);

export function setTheme(t: Theme) {
  current = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // storage blocked: the choice just won't be remembered
  }
  apply(t);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// { theme, setTheme, toggle } shared by every component that uses it
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}