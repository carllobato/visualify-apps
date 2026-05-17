"use client";

import type { ReactNode, RefObject } from "react";
import { appShellRailFooterActionWrapClassName } from "./rail-layout-classes";
import { appShellRailIconWellClassName, railLabelClass } from "./rail-row-classes";

export type AppShellRailAccountTriggerProps = {
  menuOpen: boolean;
  onToggle: () => void;
  rowClassName: string;
  /** Defaults to {@link railLabelClass}. */
  labelClassName?: string;
  pageActive?: boolean;
  icon: ReactNode;
  label?: string;
  menu?: ReactNode;
  menuRef?: RefObject<HTMLDivElement | null>;
};

/** Dropdown panel anchored above the rail account row. */
export const appShellRailAccountMenuClassName =
  "absolute inset-x-0 bottom-full z-[100] mb-[var(--ds-space-1)] w-full min-w-0 ds-app-menu-dropdown";

/**
 * Presentational account row in a collapsible rail (icon + label + dropdown anchor).
 * Products own auth state and menu items; pass them via `menu`.
 */
export function AppShellRailAccountTrigger({
  menuOpen,
  onToggle,
  rowClassName,
  labelClassName = railLabelClass,
  pageActive = false,
  icon,
  label = "Account",
  menu,
  menuRef,
}: AppShellRailAccountTriggerProps) {
  return (
    <div className={appShellRailFooterActionWrapClassName} ref={menuRef}>
      <button
        type="button"
        className={rowClassName}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        aria-current={pageActive ? "page" : undefined}
        title="Account"
        onClick={onToggle}
      >
        <span className={appShellRailIconWellClassName}>{icon}</span>
        <span className={labelClassName}>{label}</span>
      </button>
      {menu}
    </div>
  );
}

