"use client";

import { useSyncExternalStore } from "react";

export const THEME_STORAGE_KEY = "dashboard-theme";
export const THEME_CHANGE_EVENT = "dashboard-theme-change";

export function subscribeToTheme(onThemeChange: () => void) {
  window.addEventListener("storage", onThemeChange);
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);

  return () => {
    window.removeEventListener("storage", onThemeChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  };
}

export function getThemeSnapshot() {
  // Prefer the explicit browser preference, then fall back to the cookie that
  // the server uses for its initial render.
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme) return storedTheme === "dark";
  } catch {
    // Storage can be unavailable in private browsing; the cookie still works.
  }

  return document.cookie
    .split("; ")
    .some((cookie) => cookie === `${THEME_STORAGE_KEY}=dark`);
}

export function getServerThemeSnapshot() {
  return false;
}

/** Shared theme snapshot so every page uses the same server/client fallback. */
export default function useDashboardTheme(initialDarkMode = false) {
  return useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => initialDarkMode,
  );
}
