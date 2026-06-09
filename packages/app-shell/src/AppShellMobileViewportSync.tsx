"use client";

import { useEffect } from "react";
import { bindAppShellIosStandaloneClass } from "./app-shell-mobile-viewport";

/** Keeps `html.vf-app-shell-ios-standalone` in sync — required because iOS ignores `(display-mode: standalone)`. */
export function AppShellMobileViewportSync() {
  useEffect(() => bindAppShellIosStandaloneClass(), []);
  return null;
}
