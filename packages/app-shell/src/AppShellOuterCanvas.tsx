"use client";

import "./app-shell-frame.css";
import "./app-shell-mobile-shell.css";
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
 * Signed-in shell root. Required wrapper for mobile chrome and the rail drawer.
 *
 * **Desktop (≥768px):** {@link AppShellRail} beside {@link AppShellMainColumn} (persistent rail).
 *
 * **Mobile (≤767px):** {@link AppShellMobileHeader} + scroll frame inside the main column;
 * optional {@link AppShellMobileBottomNav} with app-specific `items`. A `kind: "more"` item opens
 * the existing rail drawer. Set `showMenuTrigger={false}` on the header when using a “More” tab.
 *
 * Pass `mobileHeaderExpected` when the main column always includes {@link AppShellMobileHeader}
 * (suppresses a one-frame floating hamburger). Safe-area insets and bottom scroll padding are
 * applied automatically via presence classes on this canvas.
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
