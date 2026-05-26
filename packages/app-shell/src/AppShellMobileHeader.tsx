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
  className?: string;
};

/**
 * Sticky mobile top bar (below `md`) with menu trigger, app identity, and optional page context.
 * Must render inside {@link AppShellOuterCanvas} so the rail can suppress the floating hamburger.
 */
export function AppShellMobileHeader({
  appName,
  appIcon,
  pageTitle,
  rightSlot,
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
          <AppShellMobileNavTrigger className="vf-app-shell-mobile-nav-trigger--in-header" />
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
        </div>
        {rightSlot != null ? (
          <div className="vf-app-shell-mobile-header__trailing">{rightSlot}</div>
        ) : null}
      </div>
    </header>
  );
}
