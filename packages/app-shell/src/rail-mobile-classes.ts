/**
 * Tailwind modifiers for rail chrome when the mobile drawer is open (`data-mobile-open` on the aside).
 * Desktop hover/pin behaviour is unchanged above `md`.
 */

/** Nav / footer row labels — visible when the mobile drawer is open. */
export const appShellRailMobileOpenLabelRevealClassName =
  "max-md:group-data-[mobile-open=true]:w-auto max-md:group-data-[mobile-open=true]:flex-1 max-md:group-data-[mobile-open=true]:max-w-[11rem] max-md:group-data-[mobile-open=true]:opacity-100";

/** Row gap between icon and label when the mobile drawer is open. */
export const appShellRailMobileOpenRowGapClassName = "max-md:group-data-[mobile-open=true]:gap-2";

/** Section headings and brand title row when the mobile drawer is open. */
export const appShellRailMobileOpenFlexRevealClassName = "max-md:group-data-[mobile-open=true]:flex";

/** Section heading width when the mobile drawer is open. */
export const appShellRailMobileOpenSectionHeadingRevealClassName =
  "max-md:group-data-[mobile-open=true]:max-w-[11rem] max-md:group-data-[mobile-open=true]:w-auto max-md:group-data-[mobile-open=true]:opacity-100";

/** Full-width rules / footer rows when the mobile drawer is open. */
export const appShellRailMobileOpenMaxWidthRevealClassName =
  "max-md:group-data-[mobile-open=true]:max-w-none";

/** Pin/collapse row visible when the mobile drawer is open. */
export const appShellRailMobileOpenPinRevealClassName =
  "max-md:group-data-[mobile-open=true]:pointer-events-auto max-md:group-data-[mobile-open=true]:max-h-20 max-md:group-data-[mobile-open=true]:opacity-100";

/** Section rule hidden when the mobile drawer is open (label shown instead). */
export const appShellRailMobileOpenSectionRuleHideClassName =
  "max-md:group-data-[mobile-open=true]:opacity-0";
