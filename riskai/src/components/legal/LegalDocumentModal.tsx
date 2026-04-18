"use client";

import { useEffect } from "react";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";
import { TermsContent } from "./TermsContent";

export type LegalDocumentId = "privacy" | "terms";

const documentMeta: Record<LegalDocumentId, { title: string; effectiveDate: string }> = {
  privacy: {
    title: "Privacy Policy",
    effectiveDate: "March 21, 2026",
  },
  terms: {
    title: "Terms & Conditions",
    effectiveDate: "March 21, 2026",
  },
};

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function LegalDocumentModal({ legalDocument, onClose }: { legalDocument: LegalDocumentId; onClose: () => void }) {
  const meta = documentMeta[legalDocument];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" role="presentation">
      <button
        type="button"
        aria-label="Close"
        className="ds-modal-backdrop-surface absolute inset-0 cursor-default transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-doc-title"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_60%,transparent)] bg-[color-mix(in_oklab,var(--ds-surface-muted)_95%,transparent)] shadow-[var(--ds-shadow-modal-panel)] dark:border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] dark:bg-[var(--ds-surface-inset)]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="min-w-0 flex-1">
            <h1
              id="legal-doc-title"
              className="text-2xl font-semibold tracking-tight text-[var(--ds-text-primary)] sm:text-[1.75rem]"
            >
              {meta.title}
            </h1>
            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--ds-text-muted)]">
              Effective {meta.effectiveDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 cursor-pointer rounded-full p-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-surface-hover)] hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {legalDocument === "privacy" ? <PrivacyPolicyContent inModal /> : <TermsContent inModal />}
        </div>

        {/* Footer — subtle close only */}
        <div className="flex shrink-0 items-center justify-end border-t border-[color-mix(in_oklab,var(--ds-border)_50%,transparent)] px-6 py-3 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm font-medium text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-border)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
