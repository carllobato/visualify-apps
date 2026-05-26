"use client";

import "./app-shell-frame.css";
import "./app-shell-app-menu.css";
import type { MouseEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppShellMobileNavTrigger } from "./AppShellMobileNavTrigger";
import { useAppShellRailMobileNav } from "./app-shell-rail-mobile-context";
import {
  appShellRailAsideClassName,
  appShellRailBodyClassName,
  appShellRailExpandedWidthClassName,
  appShellRailFooterAccountOuterTailwindClassName,
  appShellRailFooterClassName,
  appShellRailHeaderClassName,
  appShellRailHoverTimingClassName,
  appShellRailPadXClassName,
  appShellRailPinRevealClassName,
  appShellRailPinRevealPinnedClassName,
  appShellRailPinnedWidthClassName,
  appShellRailSeparatorClassName,
} from "./rail-layout-classes";
import {
  appShellRailFooterAccountOuterClassName,
  appShellRailFooterAccountStripClassName,
} from "./layout-classes";
import { AppShellRailPinCollapse } from "./AppShellRailPinCollapse";
import { useAppShellMobileHeaderPresent } from "./app-shell-mobile-header-context";
import { shouldCloseMobileDrawerForRailButton } from "./rail-mobile-nav-action";

/** Fixed hamburger below `md` — layout in `app-shell-frame.css` (safe-area + 44px target). */
const appShellRailBuiltInMobileTriggerClassName = "vf-app-shell-mobile-nav-trigger";

type AppShellRailContextValue = {
  pinned: boolean;
  togglePinned: () => void;
};

const AppShellRailContext = createContext<AppShellRailContextValue | null>(null);

function useAppShellRailContext(): AppShellRailContextValue {
  const ctx = useContext(AppShellRailContext);
  if (ctx == null) {
    throw new Error("AppShellRail compound components must be used within <AppShellRail>");
  }
  return ctx;
}

export type AppShellRailProps = {
  children: ReactNode;
  /** Accessible name for the rail landmark. */
  ariaLabel: string;
  /**
   * When set, pin state is persisted in `localStorage` under this key.
   * Omit for hover-only rails without a pin/collapse control.
   */
  pinnedStorageKey?: string;
  /**
   * When false, never mount the legacy floating hamburger below `md`.
   * When true (default), mounts it only if no {@link AppShellMobileHeader} is present.
   */
  builtInMobileNavTrigger?: boolean;
  className?: string;
};

function mergeClass(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

/**
 * Collapsible platform rail shell (`aside` + pin state).
 * Compose with {@link AppShellRailBody}, {@link AppShellRailHeader}, {@link AppShellRailFooter}, etc.
 */
export function AppShellRail({
  children,
  ariaLabel,
  pinnedStorageKey,
  builtInMobileNavTrigger = true,
  className,
}: AppShellRailProps) {
  const [pinned, setPinned] = useState(false);
  const skipInitialPersist = useRef(true);
  const { mobileOpen, closeMobile } = useAppShellRailMobileNav();

  useEffect(() => {
    if (!pinnedStorageKey) return;
    try {
      if (localStorage.getItem(pinnedStorageKey) === "true") {
        setPinned(true);
      }
    } catch {
      /* ignore */
    }
  }, [pinnedStorageKey]);

  useEffect(() => {
    if (!pinnedStorageKey) return;
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(pinnedStorageKey, pinned ? "true" : "false");
    } catch {
      /* ignore */
    }
  }, [pinned, pinnedStorageKey]);

  const mobileHeaderPresent = useAppShellMobileHeaderPresent();
  const showFloatingMobileTrigger =
    builtInMobileNavTrigger && !mobileHeaderPresent;

  const widthClass = pinned ? appShellRailPinnedWidthClassName : appShellRailExpandedWidthClassName;

  const handleRailClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!mobileOpen) return;
    const target = event.target as HTMLElement;

    const anchor = target.closest("a[href]");
    if (anchor) {
      closeMobile();
      return;
    }

    const button = target.closest("button");
    if (button && shouldCloseMobileDrawerForRailButton(button)) {
      closeMobile();
    }
  };

  return (
    <AppShellRailContext.Provider value={{ pinned, togglePinned: () => setPinned((p) => !p) }}>
      {showFloatingMobileTrigger ? (
        <AppShellMobileNavTrigger className={appShellRailBuiltInMobileTriggerClassName} />
      ) : null}

      <aside
        id="vf-app-shell-rail"
        data-pinned={pinned ? "true" : undefined}
        data-mobile-open={mobileOpen ? "true" : undefined}
        className={mergeClass(
          `${appShellRailAsideClassName} ${widthClass} transition-[width,transform] ${appShellRailHoverTimingClassName}`,
          className,
        )}
        aria-label={ariaLabel}
        onClickCapture={handleRailClickCapture}
      >
        {children}
      </aside>
    </AppShellRailContext.Provider>
  );
}

export type AppShellRailBodyProps = {
  children: ReactNode;
  className?: string;
};

export function AppShellRailBody({ children, className }: AppShellRailBodyProps) {
  return (
    <div className={mergeClass(`${appShellRailBodyClassName} ${appShellRailPadXClassName}`, className)}>
      {children}
    </div>
  );
}

export type AppShellRailHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function AppShellRailHeader({ children, className }: AppShellRailHeaderProps) {
  return <div className={mergeClass(appShellRailHeaderClassName, className)}>{children}</div>;
}

export function AppShellRailSeparator() {
  return <div className={appShellRailSeparatorClassName} role="separator" aria-hidden="true" />;
}

export type AppShellRailFooterProps = {
  children: ReactNode;
  /** When true, renders {@link AppShellRailPinCollapse} above footer children. */
  pinCollapse?: boolean;
  className?: string;
};

export function AppShellRailFooter({
  children,
  pinCollapse = false,
  className,
}: AppShellRailFooterProps) {
  const { pinned, togglePinned } = useAppShellRailContext();

  return (
    <div className={mergeClass(appShellRailFooterClassName, className)}>
      {pinCollapse ? (
        <div className={pinned ? appShellRailPinRevealPinnedClassName : appShellRailPinRevealClassName}>
          <AppShellRailPinCollapse pinned={pinned} onToggle={togglePinned} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export type AppShellRailFooterAccountProps = {
  children: ReactNode;
  className?: string;
};

/** Account menu / sign-out slot at the bottom of the rail. */
export function AppShellRailFooterAccount({ children, className }: AppShellRailFooterAccountProps) {
  return (
    <div
      className={mergeClass(
        `${appShellRailFooterAccountOuterClassName} ${appShellRailFooterAccountOuterTailwindClassName}`,
        className,
      )}
    >
      <div className={appShellRailFooterAccountStripClassName}>{children}</div>
    </div>
  );
}
