/** Shared marketing tokens for RiskAI landing (website app). */

export const riskaiAppOrigin = (
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_RISKAI_APP_ORIGIN?.trim()) ||
  "https://app.visualify.com.au"
).replace(/\/+$/, "");

export const RISKAI_APP_URL = riskaiAppOrigin;
export const RISKAI_LOGIN_URL = `${riskaiAppOrigin}/login`;

/** Softer than raw `--ds-text-secondary` for long body copy (token-based mix). */
export const bodySecondaryClass =
  "text-[color-mix(in_oklab,var(--ds-text-secondary)_86%,var(--ds-text-primary))]";

/** Primary CTA — slightly taller for clearer affordance. */
export const linkPrimaryClass =
  "inline-flex h-11 min-h-[2.75rem] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-6 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-primary-text)] shadow-[var(--ds-shadow-sm)] transition-all duration-150 ease-out " +
  "bg-[var(--ds-primary)] hover:bg-[var(--ds-primary-hover)] active:brightness-[0.97] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

export const linkSecondaryClass =
  "inline-flex h-11 min-h-[2.75rem] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-6 text-[length:var(--ds-text-base)] font-medium transition-all duration-150 ease-out " +
  "border border-[color-mix(in_oklab,var(--ds-border-subtle)_90%,transparent)] bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_6%,transparent)] " +
  "hover:border-[color-mix(in_oklab,var(--ds-border-subtle)_100%,transparent)] hover:bg-[var(--ds-surface-hover)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

/** Matches design-system `Button` secondary `md` — aligned with RiskAI TopNav chrome. */
export const headerSignInClass =
  "inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[var(--ds-radius-sm)] px-4 text-[length:var(--ds-text-sm)] font-medium no-underline transition-all duration-150 ease-out " +
  "border border-[color-mix(in_oklab,var(--ds-border-subtle)_88%,transparent)] bg-[var(--ds-surface)] text-[var(--ds-text-primary)] shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_5%,transparent)] " +
  "hover:bg-[var(--ds-surface-hover)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]";

/** Marketing cards — subtle default rim; gentle hover lift. */
export const marketingCardHoverClass =
  "border border-[color-mix(in_oklab,var(--ds-border-subtle)_72%,transparent)] bg-[var(--ds-surface)] shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_5%,transparent)] " +
  "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out " +
  "hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--ds-border-subtle)_88%,transparent)] hover:shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--ds-scrim-ink)_12%,transparent)] " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[0_1px_2px_color-mix(in_oklab,var(--ds-scrim-ink)_5%,transparent)]";

export const sectionAnchorOffsetClass = "scroll-mt-[var(--ds-app-header-height)]";

/** Consistent vertical rhythm between major bands. */
export const sectionPadSpacing = "px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28";

export const surfacePageClass = "bg-[var(--ds-app-document-bg)]";

/** Very subtle banding — alternates with `surfacePageClass` without heavy texture. */
export const surfaceMutedBandClass =
  "bg-[color-mix(in_oklab,var(--ds-surface-muted)_38%,var(--ds-app-document-bg))]";

export const containerWideClass = "mx-auto w-full max-w-6xl";

/** Section headings — readable measure, predictable gap to body. */
export const sectionHeadingClass = "ds-heading-2 max-w-[40rem] text-balance";

export const pricingTierHeaderClass =
  "mb-0 flex min-h-0 flex-col gap-1.5 [&_h3]:mb-0 [&_p]:mb-0";
