export { visualifyAppDocumentTitle } from "./visualify-document-title";

export {
  appShellRailEntitySectionClassName,
  appShellRailIconWellClassName,
  appShellRailFooterIconWellClassName,
  appShellRailNavIconSlotClassName,
  appShellRailNavStackGapClassName,
  appShellRailPrimaryNavClassName,
  railBrandTitleClass,
  railLabelClass,
  RAIL_ROW_ACTIVE_CLASS,
  RAIL_ROW_INACTIVE_CLASS,
  RAIL_ROW_SHELL_CLASS,
  shellPageHeaderRailRowClassName,
} from "./rail-row-classes";

/** @deprecated Use {@link RAIL_ROW_ACTIVE_CLASS} — kept for existing product rails. */
export { RAIL_NAV_ROW_ACTIVE_CLASS } from "./rail-nav-row-classes";
/** @deprecated Use {@link RAIL_ROW_INACTIVE_CLASS} — kept for existing product rails. */
export { RAIL_NAV_ROW_INACTIVE_CLASS } from "./rail-nav-row-classes";
/** @deprecated Use {@link RAIL_ROW_SHELL_CLASS} — kept for existing product rails. */
export { RAIL_NAV_ROW_SHELL_CLASS } from "./rail-nav-row-classes";

export {
  APP_SHELL_RAIL_COLLAPSED_WIDTH_PX,
  appShellRailAsideClassName,
  appShellRailBodyClassName,
  appShellRailExpandedWidthClassName,
  appShellRailFooterActionWrapClassName,
  appShellRailFooterAccountOuterTailwindClassName,
  appShellRailFooterRowOuterTailwindClassName,
  appShellRailFooterClassName,
  appShellRailHeaderClassName,
  appShellRailHoverTimingClassName,
  appShellRailPadXClassName,
  appShellRailPinRevealClassName,
  appShellRailPinRevealPinnedClassName,
  appShellRailPinnedWidthClassName,
  appShellRailSeparatorClassName,
} from "./rail-layout-classes";

export {
  appShellRailFooterAccountRowClass,
  appShellRailFooterControlRowClass,
  appShellRailNavButtonRowClass,
  appShellRailNavRowClass,
} from "./rail-footer-row-classes";

export {
  appShellFrameGutterClassName,
  appShellFramedSurfaceClassName,
  appShellMainColumnClassName,
  appShellOuterCanvasClassName,
  appShellRailFooterAccountOuterClassName,
  appShellRailFooterAccountStripClassName,
  appShellScrollFooterSlotClassName,
  appShellScrollInnerCenteredClassName,
  appShellScrollMainSlotClassName,
  appShellScrollRegionClassName,
} from "./layout-classes";

export {
  AppShellPageHeader,
  appShellPageHeaderDescriptionClassName,
  appShellPageTitleClassName,
} from "./AppShellPageHeader";
export type { AppShellPageHeaderProps } from "./AppShellPageHeader";

export {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellOuterCanvas,
  AppShellScrollBodyCentered,
  AppShellScrollRegion,
} from "./AppShellFrame";
export type {
  AppShellFrameGutterProps,
  AppShellFramedSurfaceProps,
  AppShellMainColumnProps,
  AppShellOuterCanvasProps,
  AppShellScrollBodyCenteredProps,
  AppShellScrollRegionProps,
} from "./AppShellFrame";

export { AppShellLegalFooter } from "./AppShellLegalFooter";
export type { AppShellLegalFooterProps } from "./AppShellLegalFooter";

export {
  AppShellLegalDocumentProvider,
  AppShellLegalDocumentLink,
  AppShellLegalDocumentModal,
  AppShellLegalFooterWithModals,
  PrivacyPolicyContent,
  TermsContent,
  useAppShellLegalDocument,
} from "./legal";
export type { AppShellLegalDocumentId } from "./legal";

export {
  AppShellRail,
  AppShellRailBody,
  AppShellRailFooter,
  AppShellRailFooterAccount,
  AppShellRailHeader,
  AppShellRailSeparator,
} from "./AppShellRail";
export type {
  AppShellRailBodyProps,
  AppShellRailFooterAccountProps,
  AppShellRailFooterProps,
  AppShellRailHeaderProps,
  AppShellRailProps,
} from "./AppShellRail";

export { AppShellRailNavSection } from "./AppShellRailNavSection";

export { AppShellRailNavLink } from "./AppShellRailNavLink";
export type { AppShellRailNavLinkProps } from "./AppShellRailNavLink";

export { AppShellEntityAvatar } from "./AppShellEntityAvatar";
export type { AppShellEntityAvatarProps, AppShellEntityAvatarSize } from "./AppShellEntityAvatar";

export { AppShellRailBrandAppMenu } from "./AppShellRailBrandAppMenu";
export type {
  AppShellRailAppCatalogEntry,
  AppShellRailBrandAppMenuProps,
} from "./AppShellRailBrandAppMenu";

export { AppShellRailBrandMark } from "./AppShellRailBrandMark";
export type { AppShellRailBrandMarkProps } from "./AppShellRailBrandMark";

export { AppShellRailPinCollapse } from "./AppShellRailPinCollapse";
export type { AppShellRailPinCollapseProps } from "./AppShellRailPinCollapse";

export {
  AppShellRailAccountTrigger,
  appShellRailAccountMenuClassName,
} from "./AppShellRailAccountTrigger";
export type { AppShellRailAccountTriggerProps } from "./AppShellRailAccountTrigger";

export {
  AppShellRailFooterHelp,
  AppShellRailFooterHelpTrigger,
} from "./AppShellRailFooterHelp";
export type {
  AppShellRailFooterHelpProps,
  AppShellRailFooterHelpTriggerProps,
} from "./AppShellRailFooterHelp";

export { AppShellHelpFeedbackModal } from "./AppShellHelpFeedbackModal";
export type {
  AppShellHelpFeedbackModalProps,
  AppShellHelpFeedbackUser,
} from "./AppShellHelpFeedbackModal";

export { AppShellRailHelpFeedback } from "./AppShellRailHelpFeedback";
export type { AppShellRailHelpFeedbackProps } from "./AppShellRailHelpFeedback";

export {
  listFactorsIndicatesVerifiedTotp,
  totpFactorsFromListFactors,
} from "./account-security/mfa";
export type { MfaListFactorsLike } from "./account-security/mfa";
export type { AppShellSupabaseAuthClient } from "./account-security/types";

export { AppShellLastLoginPanel } from "./AppShellLastLoginPanel";
export type { AppShellLastLoginPanelProps } from "./AppShellLastLoginPanel";

export { AppShellTwoFactorSetup } from "./AppShellTwoFactorSetup";
export type { AppShellTwoFactorSetupProps } from "./AppShellTwoFactorSetup";

export { AppShellSignOutButton } from "./AppShellSignOutButton";
export type { AppShellSignOutButtonProps } from "./AppShellSignOutButton";

export { AppShellSignOutEverywhereButton } from "./AppShellSignOutEverywhereButton";
export type { AppShellSignOutEverywhereButtonProps } from "./AppShellSignOutEverywhereButton";

export { AppShellChangePasswordForm } from "./AppShellChangePasswordForm";
export type { AppShellChangePasswordFormProps } from "./AppShellChangePasswordForm";

export { AppShellDeleteAccountSection } from "./AppShellDeleteAccountSection";
export type { AppShellDeleteAccountSectionProps } from "./AppShellDeleteAccountSection";

export {
  AccountSettingsCard,
  AccountSettingsCardContent,
  AccountSettingsCardFooter,
  AccountSettingsCardHeader,
  AccountSettingsHeader,
  AccountSettingsPage,
  AccountSettingsAppsPanel,
  AccountSettingsAuthenticationPanel,
  AccountSettingsProfilePanel,
  AccountSettingsTabs,
  VISUALIFY_ACCOUNT_SETTINGS_APP_CATALOG,
  VISUALIFY_STAFF_ONLY_ACCOUNT_APP_CATALOG,
  buildVisualifyAccountAppCatalogForUser,
  resolveAccountSettingsEntitledProductKeys,
  isVisualifyStaffEmail,
  AccountSettingsTabsShell,
  useAccountSettingsProfilePanel,
  accountSettingsCardClassName,
  accountSettingsCardContentClassName,
  accountSettingsCardContentFormClassName,
  accountSettingsCardFooterClassName,
  accountSettingsCardHeaderClassName,
  accountSettingsCardTitleClassName,
  accountSettingsCardTitleDangerClassName,
  accountSettingsHeaderDescriptionClassName,
  accountSettingsIntroTextClassName,
  accountSettingsPanelSectionClassName,
  accountSettingsTabsShellClassName,
} from "./account-settings";
export type {
  AccountSettingsCardContentProps,
  AccountSettingsCardFooterProps,
  AccountSettingsCardHeaderProps,
  AccountSettingsCardProps,
  AccountSettingsHeaderProps,
  AccountSettingsPageProps,
  AccountSettingsAppCatalogEntry,
  AccountSettingsAppsPanelProps,
  AccountSettingsAuthenticationPanelProps,
  AccountSettingsProfilePanelProps,
  AccountSettingsSignOutConfig,
  AccountSettingsSignOutEverywhereConfig,
  AccountSettingsTabConfig,
  AccountSettingsTabsProps,
  AccountSettingsTabsShellProps,
} from "./account-settings";

export {
  APP_LOGIN_DEFAULT_BRAND_MARK_SRC,
  AppLoginBrandMark,
  AppLoginCard,
  AppLoginCardSuspense,
  AppLoginCardHeader,
  AppLoginCardLegalFooter,
  AppLoginCopyright,
  AppLoginFormError,
  AppLoginPasswordField,
  AppLoginFramedShell,
  AppLoginScreen,
  AppLoginPage,
  AppLoginSuspenseFallback,
  AppLoginTabsSection,
  AppLoginSubmitRow,
  appLoginSubmitLabelsForMode,
  AppLoginTrustLine,
  appLoginCardClassName,
  appLoginCardContentClassName,
  appLoginCardHeaderClassName,
  appLoginFormSkeletonMinHeightClassName,
  appLoginCardLegalFooterClassName,
  appLoginTabsDividerClassName,
  appLoginTabsRowClassName,
  appLoginCardLegalLinkClassName,
  appLoginCardLegalNavClassName,
  appLoginCardLegalSepClassName,
  appLoginCardTitleClassName,
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
} from "./login-shell";
export type {
  AppLoginBrandMarkProps,
  AppLoginCardHeaderProps,
  AppLoginCardLegalFooterProps,
  AppLoginCardProps,
  AppLoginCardSuspenseProps,
  AppLoginCopyrightProps,
  AppLoginFormErrorProps,
  AppLoginPasswordFieldProps,
  AppLoginFramedShellProps,
  AppLoginScreenProps,
  AppLoginPageProps,
  AppLoginTabsSectionProps,
  AppLoginSubmitRowProps,
  AppLoginTrustLineProps,
} from "./login-shell";
