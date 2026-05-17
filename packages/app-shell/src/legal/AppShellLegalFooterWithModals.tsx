"use client";

import { AppShellLegalFooter, type AppShellLegalFooterProps } from "../AppShellLegalFooter";
import { AppShellLegalDocumentLink } from "./AppShellLegalDocumentLink";

/**
 * App shell footer with privacy/terms links that open in-app modals.
 * Requires {@link AppShellLegalDocumentProvider} at the app root.
 */
export function AppShellLegalFooterWithModals({
  copyrightHolder,
  year,
  className,
  trailing,
}: Pick<AppShellLegalFooterProps, "copyrightHolder" | "year" | "className" | "trailing">) {
  return (
    <AppShellLegalFooter
      copyrightHolder={copyrightHolder}
      year={year}
      className={className}
      trailing={trailing}
      privacyLink={
        <AppShellLegalDocumentLink document="privacy" className="vf-app-shell-legal-footer-link">
          Privacy Policy
        </AppShellLegalDocumentLink>
      }
      termsLink={
        <AppShellLegalDocumentLink document="terms" className="vf-app-shell-legal-footer-link">
          Terms &amp; Conditions
        </AppShellLegalDocumentLink>
      }
    />
  );
}
