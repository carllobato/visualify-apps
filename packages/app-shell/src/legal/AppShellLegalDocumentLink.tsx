"use client";

import type { AppShellLegalDocumentId } from "./AppShellLegalDocumentModal";
import { useAppShellLegalDocument } from "./AppShellLegalDocumentProvider";

type AppShellLegalDocumentLinkProps = {
  document: AppShellLegalDocumentId;
  className?: string;
  children: React.ReactNode;
};

/** Opens privacy/terms in the shared app-shell modal; keeps `/privacy` and `/terms` as fallback hrefs. */
export function AppShellLegalDocumentLink({ document: doc, className, children }: AppShellLegalDocumentLinkProps) {
  const { openLegalDocument } = useAppShellLegalDocument();
  const href = doc === "privacy" ? "/privacy" : "/terms";

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openLegalDocument(doc);
      }}
    >
      {children}
    </a>
  );
}
