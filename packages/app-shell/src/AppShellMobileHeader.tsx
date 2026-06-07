"use client";

import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useAppShellMobileHeaderPresenceRegistration } from "./app-shell-mobile-header-context";
import { AppShellMobileNavTrigger } from "./AppShellMobileNavTrigger";

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type AppShellMobileHeaderProps = {
  appName: string;
  appIcon?: ReactNode;
  pageTitle?: string;
  rightSlot?: ReactNode;
  /**
   * When set, replaces the default identity block (icon + titles). Use for linked identity
   * or other product-specific chrome; keep app-shell header classes on the root element.
   */
  appIdentity?: ReactNode;
  /**
   * When false, omits the in-header hamburger (standard when bottom nav includes `kind: "more"`).
   * @default true
   */
  showMenuTrigger?: boolean;
  className?: string;
};

/**
 * Sticky mobile top bar (≤767px) with optional menu trigger, app identity, and page context.
 * Mount inside {@link AppShellMainColumn} within {@link AppShellOuterCanvas}. Pair with
 * `mobileHeaderExpected` on the canvas. When using {@link AppShellMobileBottomNav} with
 * `kind: "more"`, pass `showMenuTrigger={false}` so the drawer opens from the bottom bar only.
 * Optional polish: `className={appShellMobileShellHeaderClassName}`.
 */
export function AppShellMobileHeader({
  appName,
  appIcon,
  pageTitle,
  rightSlot,
  appIdentity,
  showMenuTrigger = true,
  className,
}: AppShellMobileHeaderProps) {
  const { registerMobileHeader, unregisterMobileHeader } =
    useAppShellMobileHeaderPresenceRegistration();

  useLayoutEffect(() => {
    registerMobileHeader();
    return unregisterMobileHeader;
  }, [registerMobileHeader, unregisterMobileHeader]);

  const contextLabel = pageTitle?.trim() ? pageTitle.trim() : null;

  const headerLabel =
    contextLabel != null ? `${appName}, ${contextLabel}` : appName;

  return (
    <header
      className={mergeClass("vf-app-shell-mobile-header", className)}
      aria-label={headerLabel}
    >
      <div className="vf-app-shell-mobile-header__inner">
        <div className="vf-app-shell-mobile-header__leading">
          {showMenuTrigger ? (
            <AppShellMobileNavTrigger className="vf-app-shell-mobile-nav-trigger--in-header" />
          ) : null}
          {appIdentity != null ? (
            appIdentity
          ) : (
            <div className="vf-app-shell-mobile-header__identity">
              {appIcon != null ? (
                <span className="vf-app-shell-mobile-header__icon" aria-hidden>
                  {appIcon}
                </span>
              ) : null}
              <div className="vf-app-shell-mobile-header__titles">
                <span className="vf-app-shell-mobile-header__app-name">{appName}</span>
                {contextLabel != null ? (
                  <span className="vf-app-shell-mobile-header__page-title">{contextLabel}</span>
                ) : null}
              </div>
            </div>
          )}
        </div>
        {rightSlot != null ? (
          <div className="vf-app-shell-mobile-header__trailing">{rightSlot}</div>
        ) : null}
      </div>
    </header>
  );
}
