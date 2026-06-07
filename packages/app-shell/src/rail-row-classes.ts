/**
 * Styling helpers for interactive rows in a collapsible side rail (links, buttons, entity lists).
 * Products supply their own routes, labels, and icons; this module only provides shared chrome.
 */

import { appShellRailMobileOpenLabelRevealClassName, appShellRailMobileOpenRowGapClassName } from "./rail-mobile-classes";

/** Typography for a rail brand / title row — pair with {@link shellPageHeaderRailRowClassName} on page headers. */
export const railBrandTitleClass =
  "text-[length:var(--ds-text-base)] font-medium leading-tight tracking-tight";

/** 40px row height for vertical alignment between rail controls and the main document column. */
export const shellPageHeaderRailRowClassName =
  "flex h-10 min-h-10 items-center max-md:min-h-11";

/** 40×40 icon column shared by brand, nav, pin, and footer rows. */
export const appShellRailIconWellClassName = "flex size-10 shrink-0 items-center justify-center";

/** 25×25 mark inside the icon well (entity avatars, nav glyphs). */
export const appShellRailNavIconSlotClassName =
  "flex size-[25px] shrink-0 items-center justify-center";

/** Footer rows use the same 40×40 icon column as primary nav (see {@link appShellRailIconWellClassName}). */
export const appShellRailFooterIconWellClassName = appShellRailIconWellClassName;

/** Vertical gap between rail interactive rows — 4px (`h-10` rows stay 40px). */
export const appShellRailNavStackGapClassName = "gap-1";

/** Primary / entity nav stack inside {@link appShellRailHeaderClassName}. */
export const appShellRailPrimaryNavClassName =
  `flex flex-col ${appShellRailNavStackGapClassName}`;

/** Grouped entity list below primary nav (e.g. HQ workspaces) — same vertical rhythm as nav. */
export const appShellRailEntitySectionClassName =
  `flex min-w-0 flex-col ${appShellRailNavStackGapClassName}`;

/** Label revealed when the rail is hovered or pinned (width/opacity transition). */
export const railLabelClass =
  "vf-app-shell-rail-expand-label min-w-0 shrink truncate text-left text-[length:var(--ds-text-sm)] font-medium leading-none " +
  "w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-[400ms] ease-out " +
  "group-data-[pinned=true]:w-auto group-data-[pinned=true]:flex-1 group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:opacity-100 " +
  appShellRailMobileOpenLabelRevealClassName;

/** Nested rail label — smaller type for sub-items under a parent row (e.g. projects under a workspace). */
export const railSubLabelClass =
  "vf-app-shell-rail-expand-label min-w-0 shrink truncate text-left text-[length:var(--ds-text-xs)] font-normal leading-snug " +
  "w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-[400ms] ease-out " +
  "group-data-[pinned=true]:w-auto group-data-[pinned=true]:flex-1 group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:opacity-100 " +
  appShellRailMobileOpenLabelRevealClassName;

export const RAIL_ROW_SHELL_CLASS =
  "vf-app-shell-rail-expand-row relative flex h-10 min-h-10 max-h-10 max-md:min-h-11 max-md:h-11 max-md:max-h-11 w-full min-w-0 items-center gap-0 rounded-[var(--ds-radius-md)] no-underline " +
  "transition-[color,background-color,box-shadow,gap] duration-[400ms] ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
  "group-data-[pinned=true]:gap-2 " +
  appShellRailMobileOpenRowGapClassName +
  " ";

export const RAIL_ROW_INACTIVE_CLASS =
  "text-[var(--ds-text-secondary)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))] hover:text-[var(--ds-text-primary)]";

export const RAIL_ROW_ACTIVE_CLASS =
  "bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-sm)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text-primary)]";
