"use client";

import { useEffect } from "react";

const STORAGE_KEY = "visualify-theme";

function resolveTheme(): "dark" | "light" {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "dark") return "dark";
    if (t === "light") return "light";
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncClassFromStorage() {
  const root = document.documentElement;
  const wantDark = resolveTheme() === "dark";
  root.classList.toggle("dark", wantDark);
}

/**
 * Next.js sets `<html className={...}>` on hydration, which replaces any `dark`
 * class applied by the inline script or direct DOM updates. Re-apply from
 * localStorage whenever the `class` attribute changes so theme + Tailwind `dark:`
 * stay in sync.
 */
export function ThemeSync() {
  useEffect(() => {
    syncClassFromStorage();

    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      const wantDark = resolveTheme() === "dark";
      const hasDark = root.classList.contains("dark");
      if (wantDark !== hasDark) {
        root.classList.toggle("dark", wantDark);
      }
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("storage", syncClassFromStorage);
    return () => {
      mo.disconnect();
      window.removeEventListener("storage", syncClassFromStorage);
    };
  }, []);

  return null;
}
