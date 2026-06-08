"use client";

import { useAppShellMobileBottomNavPresent } from "./app-shell-mobile-bottom-nav-context";
import "./app-shell-mobile-bottom-nav-scroll-spacer.css";

/**
 * Place last inside {@link AppShellPageTransition} (or route root in the scroll region) so
 * tall pages can scroll past the fixed bottom tab bar. Required when product CSS zeros shell
 * scroll padding (OS-style mobile pages).
 */
export function AppShellMobileBottomNavScrollSpacer() {
  const bottomNavPresent = useAppShellMobileBottomNavPresent();

  if (!bottomNavPresent) {
    return null;
  }

  return <div className="vf-app-shell-mobile-bottom-nav-scroll-spacer" aria-hidden="true" />;
}
