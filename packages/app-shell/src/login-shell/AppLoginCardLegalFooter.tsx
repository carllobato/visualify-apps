import type { ReactNode } from "react";
import {
  appLoginCardLegalFooterClassName,
  appLoginCardLegalLinkClassName,
  appLoginCardLegalNavClassName,
  appLoginCardLegalSepClassName,
} from "./classes";
import { mergeClass } from "../account-settings/merge-class";

export type AppLoginCardLegalFooterProps = {
  privacyHref?: string;
  termsHref?: string;
  privacyLink?: ReactNode;
  termsLink?: ReactNode;
  privacyLabel?: string;
  termsLabel?: string;
  className?: string;
};

/**
 * In-card privacy / terms row for login surfaces.
 * Supply `privacyHref`/`termsHref` or custom link nodes; no routing in this package.
 */
export function AppLoginCardLegalFooter({
  privacyHref,
  termsHref,
  privacyLink,
  termsLink,
  privacyLabel = "Privacy Policy",
  termsLabel = "Terms & Conditions",
  className,
}: AppLoginCardLegalFooterProps) {
  const privacyControl =
    privacyLink ??
    (privacyHref != null ? (
      <a href={privacyHref} className={appLoginCardLegalLinkClassName}>
        {privacyLabel}
      </a>
    ) : null);

  const termsControl =
    termsLink ??
    (termsHref != null ? (
      <a href={termsHref} className={appLoginCardLegalLinkClassName}>
        {termsLabel}
      </a>
    ) : null);

  if (privacyControl == null && termsControl == null) {
    return null;
  }

  return (
    <footer className={mergeClass(appLoginCardLegalFooterClassName, className)}>
      <nav aria-label="Legal" className={appLoginCardLegalNavClassName}>
        {privacyControl}
        {privacyControl != null && termsControl != null ? (
          <span className={appLoginCardLegalSepClassName} aria-hidden>
            ·
          </span>
        ) : null}
        {termsControl}
      </nav>
    </footer>
  );
}
