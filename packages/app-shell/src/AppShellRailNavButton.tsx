"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAppShellRailMobileNav } from "./app-shell-rail-mobile-context";
import { appShellRailNavButtonRowClass } from "./rail-footer-row-classes";
import { appShellRailIconWellClassName, railLabelClass } from "./rail-row-classes";
import {
  APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR,
  shouldCloseMobileDrawerForRailButton,
} from "./rail-mobile-nav-action";

function mergeClass(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type AppShellRailNavButtonProps = {
  active: boolean;
  label: string;
  icon: ReactNode;
  transparentWhenInactive?: boolean;
  /** @default true — closes the mobile drawer after click when appropriate. */
  closeMobileOnClick?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

/**
 * Rail navigation/selection row (`<button>`) with shared chrome and mobile drawer close.
 * Prefer over raw `<button className={appShellRailNavButtonRowClass(...)}>` for workspace pickers, etc.
 */
export function AppShellRailNavButton({
  active,
  label,
  icon,
  transparentWhenInactive = true,
  closeMobileOnClick = true,
  onClick,
  disabled,
  title,
  "aria-label": ariaLabel,
  ...rest
}: AppShellRailNavButtonProps) {
  const { closeMobile } = useAppShellRailMobileNav();

  return (
    <button
      type="button"
      {...rest}
      disabled={disabled}
      title={title ?? label}
      aria-label={ariaLabel ?? label}
      className={
        appShellRailNavButtonRowClass(active, { transparentWhenInactive }) +
        (disabled ? " opacity-60" : "")
      }
      {...(closeMobileOnClick
        ? { [APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR]: "true" }
        : { [APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR]: "false" })}
      onClick={(event) => {
        onClick?.(event);
        if (
          closeMobileOnClick &&
          !event.defaultPrevented &&
          shouldCloseMobileDrawerForRailButton(event.currentTarget)
        ) {
          closeMobile();
        }
      }}
    >
      <span className={appShellRailIconWellClassName}>{icon}</span>
      <span className={railLabelClass}>{label}</span>
    </button>
  );
}
