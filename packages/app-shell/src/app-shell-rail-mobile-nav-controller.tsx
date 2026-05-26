"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AppShellRailMobileNavProvider,
  type AppShellRailMobileNavContextValue,
} from "./app-shell-rail-mobile-context";

const appShellRailMobileBackdropClassName = "vf-app-shell-rail-mobile-backdrop";

/**
 * Owns mobile drawer open state for the signed-in shell so {@link AppShellRail} and
 * {@link AppShellMobileHeader} share one provider (siblings under {@link AppShellOuterCanvas}).
 */
export function AppShellRailMobileNavController({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo<AppShellRailMobileNavContextValue>(
    () => ({ mobileOpen, setMobileOpen, closeMobile }),
    [mobileOpen, closeMobile],
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (media.matches) closeMobile();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [closeMobile]);

  return (
    <AppShellRailMobileNavProvider value={value}>
      {mobileOpen ? (
        <button
          type="button"
          className={appShellRailMobileBackdropClassName}
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      ) : null}
      {children}
    </AppShellRailMobileNavProvider>
  );
}
