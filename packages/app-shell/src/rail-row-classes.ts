/**
 * Styling helpers for interactive rows in a collapsible side rail (links, buttons, entity lists).
 * Products supply their own routes, labels, and icons; this module only provides shared chrome.
 */

/** Typography for a rail brand / title row — pair with {@link shellPageHeaderRailRowClassName} on page headers. */
export const railBrandTitleClass =
  "text-[length:var(--ds-text-lg)] font-medium leading-none tracking-tight";

/** 40px row height for vertical alignment between rail controls and the main document column. */
export const shellPageHeaderRailRowClassName = "flex h-10 min-h-10 items-center";

/** Label revealed when the rail is hovered or pinned (width/opacity transition). */
export const railLabelClass =
  "min-w-0 shrink truncate text-left text-[length:var(--ds-text-sm)] font-medium leading-none " +
  "w-0 overflow-hidden opacity-0 transition-[width,max-width,opacity] duration-[400ms] ease-out " +
  "group-hover:w-auto group-hover:flex-1 group-hover:max-w-[11rem] group-hover:opacity-100 " +
  "group-data-[pinned=true]:w-auto group-data-[pinned=true]:flex-1 group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:opacity-100";

export const RAIL_ROW_SHELL_CLASS =
  "relative flex h-10 w-full min-w-0 items-center gap-0 rounded-[var(--ds-radius-md)] " +
  "transition-[color,background-color,box-shadow,gap] duration-[400ms] ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)] " +
  "group-hover:gap-2 group-data-[pinned=true]:gap-2 ";

export const RAIL_ROW_INACTIVE_CLASS =
  "text-[var(--ds-text-secondary)] hover:bg-[color-mix(in_oklab,var(--ds-text-primary)_5%,var(--ds-canvas))] hover:text-[var(--ds-text-primary)]";

export const RAIL_ROW_ACTIVE_CLASS =
  "bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-sm)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text-primary)]";
