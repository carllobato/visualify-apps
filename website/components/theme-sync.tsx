"use client";

import { useEffect } from "react";

const STORAGE_KEY = "visualify-theme";

/** Site is light-only: strip `dark` from `<html>` if anything re-applies it (e.g. hydration). */
function forceLight() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.removeAttribute("data-theme");
  try {
    localStorage.setItem(STORAGE_KEY, "light");
  } catch {
    /* ignore */
  }
}

/**
 * Keeps the document in light mode. Next.js can replace `<html class>` on hydration;
 * re-apply whenever the `class` attribute changes.
 */
export function ThemeSync() {
  useEffect(() => {
    forceLight();

    const root = document.documentElement;
    const mo = new MutationObserver(() => {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
        root.removeAttribute("data-theme");
      }
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });

    const onStorage = () => forceLight();
    window.addEventListener("storage", onStorage);
    return () => {
      mo.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
