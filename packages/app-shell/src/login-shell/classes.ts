/** Login card surface — matches HQ / RiskAI auth card chrome. */
export const appLoginCardClassName =
  "w-full [border-width:var(--ds-border-width)] border-[var(--ds-border)] bg-[var(--ds-surface-elevated)]";

export const appLoginCardContentClassName = "px-5 py-5";

export const appLoginTabsRowClassName = "flex justify-center";

export const appLoginTabsDividerClassName = "h-px w-full bg-[var(--ds-border)]";

/** Stable min-height for login Suspense fallbacks (avoids vertical jump on hydrate). */
export const appLoginFormSkeletonMinHeightClassName = "min-h-[17.5rem] w-full";

export const appLoginCardHeaderClassName = "mb-4 text-center";

export const appLoginCardTitleClassName =
  "m-0 text-[length:var(--ds-text-xl)] font-semibold tracking-tight text-[var(--ds-text-primary)]";

/** Vertical rhythm between fields, error, submit, trust line (login forms). */
export const appLoginFormClassName = "space-y-3";

export const appLoginFormErrorStackClassName = "space-y-1.5 text-center";

export const appLoginFormErrorClassName =
  "text-[length:var(--ds-text-sm)] leading-relaxed text-[var(--ds-danger)]";

export const appLoginSubmitRowClassName = "flex justify-center pt-1";

export const appLoginSubmitButtonClassName = "max-w-full min-w-0 whitespace-normal text-center";

export const appLoginTrustLineClassName =
  "mt-2 text-center text-[length:var(--ds-text-xs)] leading-relaxed text-[var(--ds-text-muted)]";

export const appLoginCardLegalFooterClassName = "mt-6 border-t border-[var(--ds-border)] pt-4";

export const appLoginCardLegalNavClassName =
  "flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center";

export const appLoginCardLegalLinkClassName = "ds-text-link-muted text-[length:var(--ds-text-xs)]";

export const appLoginCardLegalSepClassName =
  "select-none text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]";

export const appLoginPageMainClassName = "w-full max-w-md shrink-0 px-4 py-2";

export const appLoginCopyrightClassName =
  "mt-4 text-center text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)]";

/** Collapsed brand rail on signed-out framed login (matches HQ public shell). */
export const appLoginFramedRailAsideClassName =
  "relative z-30 flex w-[68px] shrink-0 flex-col self-stretch overflow-visible rounded-br-[var(--ds-radius-lg)] rounded-tr-[var(--ds-radius-lg)] bg-transparent";

export const appLoginFramedRailBrandLinkClassName =
  "flex h-10 w-full min-w-0 items-center justify-center rounded-[var(--ds-radius-md)] no-underline " +
  "transition-colors duration-[400ms] ease-out " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--ds-text-primary)_22%,transparent)]";

export const appLoginFramedRailStackClassName = "flex flex-col gap-2.5 px-[14px] pt-5";

/** Default path for {@link AppLoginBrandMark} in consuming apps' `public/` folder. */
export const APP_LOGIN_DEFAULT_BRAND_MARK_SRC = "/visualify-brand-mark.png";
