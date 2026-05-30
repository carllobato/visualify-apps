"use client";

import { AppShellLegalDocumentLink } from "../legal";
import { AppLoginCardLegalFooter } from "./AppLoginCardLegalFooter";
import { appLoginCardLegalLinkClassName } from "./classes";

/** In-card privacy / terms row wired to {@link AppShellLegalDocumentProvider} modals. */
export function AppLoginStandardLegalFooter() {
  return (
    <AppLoginCardLegalFooter
      privacyLink={
        <AppShellLegalDocumentLink document="privacy" className={appLoginCardLegalLinkClassName}>
          Privacy Policy
        </AppShellLegalDocumentLink>
      }
      termsLink={
        <AppShellLegalDocumentLink document="terms" className={appLoginCardLegalLinkClassName}>
          Terms &amp; Conditions
        </AppShellLegalDocumentLink>
      }
    />
  );
}
