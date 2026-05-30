/**
 * Login UI public surface for Visualify apps.
 *
 * **Canonical route composition:** {@link AppLoginScreen} → {@link AppLoginCardSuspense} → app form.
 * See `./LOGIN_ARCHITECTURE.md` before adding shells, cards, or Suspense wrappers in product repos.
 */
export {
  APP_LOGIN_DEFAULT_BRAND_MARK_SRC,
  appLoginBrandMarkCardClassName,
  appLoginBrandMarkRailClassName,
  appLoginCardClassName,
  appLoginCardContentClassName,
  appLoginCardHeaderClassName,
  appLoginFormSkeletonMinHeightClassName,
  appLoginCardLegalFooterClassName,
  appLoginCardLegalLinkClassName,
  appLoginCardLegalNavClassName,
  appLoginCardLegalSepClassName,
  appLoginCardTitleClassName,
  appLoginTabsDividerClassName,
  appLoginTabsRowClassName,
  appLoginFormClassName,
  appLoginFormErrorClassName,
  appLoginFormErrorStackClassName,
  appLoginCopyrightClassName,
  appLoginFramedRailAsideClassName,
  appLoginFramedRailBrandLinkClassName,
  appLoginFramedRailStackClassName,
  appLoginPageMainClassName,
  appLoginSubmitButtonClassName,
  appLoginSubmitRowClassName,
  appLoginTrustLineClassName,
} from "./classes";

export { AppLoginFramedShell } from "./AppLoginFramedShell";
export type { AppLoginFramedShellProps } from "./AppLoginFramedShell";

export { AppLoginScreen } from "./AppLoginScreen";
export type { AppLoginScreenProps } from "./AppLoginScreen";

export { AppLoginTabsSection } from "./AppLoginTabsSection";
export type { AppLoginTabsSectionProps } from "./AppLoginTabsSection";

export { AppLoginSuspenseFallback } from "./AppLoginSuspenseFallback";

export { AppLoginBrandMark } from "./AppLoginBrandMark";
export type { AppLoginBrandMarkProps } from "./AppLoginBrandMark";

export { AppLoginCard } from "./AppLoginCard";
export type { AppLoginCardProps } from "./AppLoginCard";

export { AppLoginCardSuspense } from "./AppLoginCardSuspense";
export type { AppLoginCardSuspenseProps } from "./AppLoginCardSuspense";

export { AppLoginCardHeader } from "./AppLoginCardHeader";
export type { AppLoginCardHeaderProps } from "./AppLoginCardHeader";

export { AppLoginFormError } from "./AppLoginFormError";
export type { AppLoginFormErrorProps } from "./AppLoginFormError";

export { AppLoginPasswordField } from "./AppLoginPasswordField";
export type { AppLoginPasswordFieldProps } from "./AppLoginPasswordField";

export { AppLoginSubmitRow, appLoginSubmitLabelsForMode } from "./AppLoginSubmitRow";
export type { AppLoginSubmitRowProps } from "./AppLoginSubmitRow";

export { AppLoginTrustLine } from "./AppLoginTrustLine";
export type { AppLoginTrustLineProps } from "./AppLoginTrustLine";

export { AppLoginCardLegalFooter } from "./AppLoginCardLegalFooter";
export type { AppLoginCardLegalFooterProps } from "./AppLoginCardLegalFooter";

export { AppLoginStandardLegalFooter } from "./AppLoginStandardLegalFooter";

export { AppLoginCopyright } from "./AppLoginCopyright";
export type { AppLoginCopyrightProps } from "./AppLoginCopyright";

export { AppLoginPage } from "./AppLoginPage";
export type { AppLoginPageProps } from "./AppLoginPage";
