/**
 * Mobile drawer close rules for in-rail `<button>` actions (workspace pickers, etc.).
 * Menu toggles (account, app switcher), pin/collapse, and the hamburger are excluded by default.
 */

/** Force-close the mobile drawer when this button is activated. */
export const APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR = "data-rail-mobile-nav-action";

/** Spread onto rail `<button>` rows that should close the mobile drawer (e.g. workspace picker). */
export const appShellRailNavActionButtonProps = {
  [APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR]: "true",
} as const;

/** Spread onto rail buttons that must not close the drawer (overrides heuristics). */
export const appShellRailNavActionButtonOptOutProps = {
  [APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR]: "false",
} as const;

/**
 * Whether activating this rail button should close the mobile drawer.
 * Used by {@link AppShellRail} click capture and {@link bindAppShellRailNavActionOnClick}.
 */
export function shouldCloseMobileDrawerForRailButton(button: HTMLButtonElement): boolean {
  const explicit = button.getAttribute(APP_SHELL_RAIL_MOBILE_NAV_ACTION_ATTR);
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  if (button.closest('[role="menu"]')) return false;
  if (button.getAttribute("aria-haspopup") === "menu") return false;
  if (button.hasAttribute("aria-pressed")) return false;
  if (button.getAttribute("aria-controls") === "vf-app-shell-rail") return false;

  return true;
}
