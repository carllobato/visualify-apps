import type { ReactNode } from "react";
import { appShellNavHrefActive } from "./app-shell-nav-active";
import type {
  AppShellMobileBottomNavItem,
  AppShellMobileBottomNavMoreItem,
} from "./AppShellMobileBottomNav";

/**
 * Visualify signed-in mobile shell standard (below this width; desktop rail from
 * {@link APP_SHELL_DESKTOP_MIN_WIDTH_PX}).
 *
 * **Desktop:** persistent {@link AppShellRail} + {@link AppShellMainColumn}.
 *
 * **Mobile:** sticky {@link AppShellMobileHeader} + framed scroll region + optional
 * {@link AppShellMobileBottomNav}. A bottom-nav item with `kind: "more"` opens the existing
 * rail drawer (`#vf-app-shell-rail`). Safe-area insets and scroll bottom padding are handled by
 * shared CSS when the header and/or bottom nav mount inside {@link AppShellOuterCanvas}.
 *
 * Products own route lists, icons, and page titles. Use {@link buildAppShellMobileBottomNavItems}
 * to map app link config into bottom-nav items.
 */

/** Last pixel width treated as mobile shell (`max-width` in shared CSS). */
export const APP_SHELL_MOBILE_MAX_WIDTH_PX = 767;

/** First pixel width for desktop persistent rail (`min-width` in shared CSS). */
export const APP_SHELL_DESKTOP_MIN_WIDTH_PX = 768;

/** Optional polish hook for {@link AppShellMobileHeader} (styles in `app-shell-mobile-shell.css`). */
export const appShellMobileShellHeaderClassName = "vf-app-shell-mobile-shell-header";

/** App-owned primary tab config (icons supplied via {@link BuildAppShellMobileBottomNavItemsOptions.renderIcon}). */
export type AppShellMobileBottomNavLinkConfig = {
  href: string;
  label: string;
};

export type BuildAppShellMobileBottomNavItemsOptions = {
  pathname: string;
  links: readonly AppShellMobileBottomNavLinkConfig[];
  /** Per-link icon — product SVGs or marks. */
  renderIcon: (link: AppShellMobileBottomNavLinkConfig) => ReactNode;
  /**
   * Append a `kind: "more"` tab that opens the mobile rail drawer.
   * @default true
   */
  includeMore?: boolean;
  /** Customize the trailing “More” tab when {@link includeMore} is true. */
  more?: Omit<AppShellMobileBottomNavMoreItem, "kind">;
};

/** Whether a bottom-nav item list includes a drawer-opening “More” tab. */
export function appShellMobileBottomNavHasMoreItem(
  items: readonly AppShellMobileBottomNavItem[],
): boolean {
  return items.some((item) => item.kind === "more");
}

/**
 * Build {@link AppShellMobileBottomNavItem}s from app route config.
 * Sets `active` via {@link appShellNavHrefActive}; optionally appends `kind: "more"`.
 */
export function buildAppShellMobileBottomNavItems(
  options: BuildAppShellMobileBottomNavItemsOptions,
): AppShellMobileBottomNavItem[] {
  const { pathname, links, renderIcon, includeMore = true, more } = options;

  const items: AppShellMobileBottomNavItem[] = links.map((link) => ({
    kind: "link",
    href: link.href,
    label: link.label,
    icon: renderIcon(link),
    active: appShellNavHrefActive(pathname, link.href),
  }));

  if (includeMore) {
    items.push({ kind: "more", ...more });
  }

  return items;
}
