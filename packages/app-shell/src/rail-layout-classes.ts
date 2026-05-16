/**
 * Collapsible rail layout tokens (width, padding, hover timing).
 * Products implement navigation content; these classes encode shared shell sizing behaviour.
 */

/** Collapsed rail width in px (used for icon column centering: (68 − 40) / 2 → 14px horizontal inset). */
export const APP_SHELL_RAIL_COLLAPSED_WIDTH_PX = 68;

/** Horizontal padding for a 68px collapsed rail with a 40px icon column. */
export const appShellRailPadXClassName = "px-[14px]";

/** Width transition: collapsed 68px → expanded up to 240px on hover. */
export const appShellRailExpandedWidthClassName =
  "w-[68px] hover:w-[min(240px,calc(100vw-16px))]";

/** Pinned-open rail width (matches hover max). */
export const appShellRailPinnedWidthClassName = "w-[min(240px,calc(100vw-16px))]";

/** Rail width transition timing (pair with `group` / `group-data-[pinned]` on {@link appShellRailAsideClassName}). */
export const appShellRailHoverTimingClassName = "duration-[400ms] ease-out will-change-[width]";

/**
 * Transparent collapsible rail aside — one viewport tall; does not grow with page content.
 * Pair with {@link appShellRailHoverTimingClassName}.
 */
export const appShellRailAsideClassName =
  "group sticky top-0 z-30 flex h-dvh max-h-dvh shrink-0 flex-col self-start overflow-visible bg-transparent " +
  "rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)]";

/** Inner column: padding + flex stack for header/nav + footer. */
export const appShellRailBodyClassName =
  "flex min-h-0 flex-1 flex-col overflow-hidden pt-5";

/** Top stack (brand, separator, primary nav) — scrolls when nav exceeds viewport. */
export const appShellRailHeaderClassName =
  "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain";

/** Bottom stack (pin/collapse + account) — pinned to the bottom of the rail. */
export const appShellRailFooterClassName =
  "flex w-full shrink-0 flex-col pt-5 pb-2 sm:pb-2.5";

/** Divider between brand and nav — expands with rail width. */
export const appShellRailSeparatorClassName =
  "h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out " +
  "group-hover:max-w-none group-data-[pinned=true]:max-w-none";

/** Pin/collapse row reveal container (visible when pinned or on rail hover). */
export const appShellRailPinRevealClassName =
  "overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
  "pointer-events-none max-h-0 opacity-0 " +
  "group-hover:pointer-events-auto group-hover:max-h-20 group-hover:opacity-100 " +
  "group-data-[pinned=true]:pointer-events-auto group-data-[pinned=true]:max-h-20 group-data-[pinned=true]:opacity-100";

/** Pin/collapse row when rail is pinned (always visible). */
export const appShellRailPinRevealPinnedClassName =
  "overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
  "pointer-events-auto max-h-20 opacity-100";

/** Account footer outer — expands with rail width. */
export const appShellRailFooterAccountOuterTailwindClassName =
  "mt-2 w-full max-w-10 shrink-0 transition-[max-width] duration-[400ms] ease-out " +
  "group-hover:max-w-none group-data-[pinned=true]:max-w-none";
