/**
 * Collapsible rail layout tokens (width, padding, hover timing).
 * Products implement navigation content; these classes encode shared shell sizing behaviour.
 */

/** Collapsed rail width in px (used for icon column centering: (68 − 40) / 2 → 14px horizontal inset). */
export const APP_SHELL_RAIL_COLLAPSED_WIDTH_PX = 68;

/** Horizontal padding for a 68px collapsed rail with a 40px icon column. */
export const appShellRailPadXClassName = "px-[14px]";

/** Delay before the collapsible rail expands on pointer enter (desktop). */
export const APP_SHELL_RAIL_HOVER_EXPAND_DELAY_MS = 300;

/** Width transition: collapsed 68px → expanded via app-shell-frame.css hover-expand rules (desktop). */
export const appShellRailExpandedWidthClassName =
  "w-[68px] max-md:data-[mobile-open=true]:w-[min(240px,calc(100vw-16px))]";

/** Pinned-open rail width (matches hover max). */
export const appShellRailPinnedWidthClassName = "w-[min(240px,calc(100vw-16px))]";

/** Rail width transition timing (pair with `group` / `group-data-[pinned]` on {@link appShellRailAsideClassName}). */
export const appShellRailHoverTimingClassName =
  "duration-[400ms] ease-out max-md:duration-[320ms] will-change-[width]";

/**
 * Transparent collapsible rail aside — one viewport tall; does not grow with page content.
 * Pair with {@link appShellRailHoverTimingClassName}.
 */
export const appShellRailAsideClassName =
  "group vf-app-shell-rail-aside sticky top-0 z-30 flex h-dvh max-h-dvh shrink-0 flex-col self-start overflow-visible bg-transparent " +
  "rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)]";

/** Inner column: padding + flex stack for header/nav + footer. */
export const appShellRailBodyClassName =
  "flex min-h-0 flex-1 flex-col pt-5";

import { appShellRailNavStackGapClassName } from "./rail-row-classes";

/** Top stack (brand, separator) — grows to fill space above the footer; does not scroll. */
export const appShellRailHeaderClassName =
  `flex min-h-0 flex-1 flex-col ${appShellRailNavStackGapClassName}`;

/** Scrollable nav / entity lists below the brand row — scrolls only when items exceed viewport. */
export const appShellRailNavScrollClassName =
  `flex min-h-0 flex-1 flex-col ${appShellRailNavStackGapClassName} overflow-y-auto overscroll-contain`;

/** Bottom stack (pin/collapse + account) — pinned to the bottom of the rail. */
export const appShellRailFooterClassName = "vf-app-shell-rail-footer";

/** Collapsed-rail horizontal rule — 40px wide, `--ds-border-subtle`, expands with rail on hover/pin. */
export const appShellRailRuleClassName =
  "vf-app-shell-rail-expand-rule h-px w-full max-w-10 shrink-0 bg-[var(--ds-border-subtle)] transition-[max-width] duration-[400ms] ease-out " +
  "group-data-[pinned=true]:max-w-none max-md:group-data-[mobile-open=true]:max-w-none";

/** Divider between brand and nav — expands with rail width. */
export const appShellRailSeparatorClassName = appShellRailRuleClassName;

/** Pin/collapse row reveal container (visible when pinned or after hover expand delay). */
export const appShellRailPinRevealClassName =
  "vf-app-shell-rail-expand-pin overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
  "pointer-events-none max-h-0 opacity-0 " +
  "group-data-[pinned=true]:pointer-events-auto group-data-[pinned=true]:max-h-20 group-data-[pinned=true]:opacity-100 " +
  "max-md:group-data-[mobile-open=true]:pointer-events-auto max-md:group-data-[mobile-open=true]:max-h-20 max-md:group-data-[mobile-open=true]:opacity-100";

/** Pin/collapse row when rail is pinned (always visible). */
export const appShellRailPinRevealPinnedClassName =
  "overflow-hidden transition-[max-height,opacity,margin-bottom] duration-[400ms] ease-out " +
  "pointer-events-auto max-h-20 opacity-100";

/** Footer help row outer — icon width when collapsed; full width on hover or pin. */
export const appShellRailFooterRowOuterTailwindClassName =
  "vf-app-shell-rail-expand-rule w-full max-w-10 shrink-0 transition-[max-width] duration-[400ms] ease-out " +
  "group-data-[pinned=true]:max-w-none max-md:group-data-[mobile-open=true]:max-w-none";

/** @deprecated Use {@link appShellRailFooterRowOuterTailwindClassName} */
export const appShellRailFooterAccountOuterTailwindClassName = appShellRailFooterRowOuterTailwindClassName;

/** Full-width footer action host (account menu, sign-out). */
export const appShellRailFooterActionWrapClassName =
  "relative flex w-full min-w-0 items-stretch";
