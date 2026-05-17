"use client";

import { AppShellLegalFooter } from "@visualify/app-shell";
import { LegalDocumentLink } from "./LegalDocumentLink";

/** RiskAI legal row — shared shell footer layout with in-app modal links. */
export function SiteLegalFooter() {
  return (
    <AppShellLegalFooter
      privacyLink={
        <LegalDocumentLink document="privacy" className="vf-app-shell-legal-footer-link">
          Privacy Policy
        </LegalDocumentLink>
      }
      termsLink={
        <LegalDocumentLink document="terms" className="vf-app-shell-legal-footer-link">
          Terms &amp; Conditions
        </LegalDocumentLink>
      }
    />
  );
}
