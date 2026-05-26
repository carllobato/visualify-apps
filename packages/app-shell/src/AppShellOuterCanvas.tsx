"use client";

import "./app-shell-frame.css";
import type { ReactNode } from "react";
import {
  AppShellMobileBottomNavPresenceProvider,
  useAppShellMobileBottomNavPresent,
} from "./app-shell-mobile-bottom-nav-context";
import {
  AppShellMobileHeaderPresenceProvider,
  useAppShellMobileHeaderPresent,
} from "./app-shell-mobile-header-context";
import { AppShellRailMobileNavController } from "./app-shell-rail-mobile-nav-controller";
import { appShellOuterCanvasClassName } from "./layout-classes";

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type AppShellOuterCanvasProps = {
  children: ReactNode;
  className?: string;
  /**
   * When true, suppresses the rail’s floating hamburger on first paint (use when this tree always
   * includes {@link AppShellMobileHeader}).
   * @default false
   */
  mobileHeaderExpected?: boolean;
};

function AppShellOuterCanvasRoot({
  children,
  className,
  mobileHeaderExpected,
}: AppShellOuterCanvasProps) {
  const headerMounted = useAppShellMobileHeaderPresent();
  const hasMobileHeader = mobileHeaderExpected || headerMounted;
  const hasMobileBottomNav = useAppShellMobileBottomNavPresent();

  return (
    <div
      className={mergeClass(
        appShellOuterCanvasClassName,
        hasMobileHeader ? "vf-app-shell-has-mobile-header" : undefined,
        hasMobileBottomNav ? "vf-app-shell-has-mobile-bottom-nav" : undefined,
        className,
      )}
      data-mobile-header={hasMobileHeader ? "true" : undefined}
      data-mobile-bottom-nav={hasMobileBottomNav ? "true" : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Full-viewport outer row (canvas). Pass rail/aside + {@link AppShellMainColumn} as children.
 * Wraps mobile-header presence so {@link AppShellRail} can hide the legacy floating trigger.
 */
export function AppShellOuterCanvas({
  children,
  className,
  mobileHeaderExpected = false,
}: AppShellOuterCanvasProps) {
  return (
    <AppShellMobileHeaderPresenceProvider mobileHeaderExpected={mobileHeaderExpected}>
      <AppShellMobileBottomNavPresenceProvider>
        <AppShellRailMobileNavController>
          <AppShellOuterCanvasRoot className={className} mobileHeaderExpected={mobileHeaderExpected}>
            {children}
          </AppShellOuterCanvasRoot>
        </AppShellRailMobileNavController>
      </AppShellMobileBottomNavPresenceProvider>
    </AppShellMobileHeaderPresenceProvider>
  );
}
