import { LegalDocumentLink } from "./LegalDocumentLink";

const linkClass =
  "text-[var(--ds-text-muted)] transition-colors hover:text-[var(--ds-text-secondary)]";

export function SiteLegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex min-h-12 shrink-0 items-center border-t border-[var(--ds-status-neutral-subtle-border)] bg-[var(--ds-surface-inset)] px-[var(--ds-space-4)] py-[var(--ds-space-3)]">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="flex flex-col items-start justify-between gap-[var(--ds-space-2)] text-[length:var(--ds-text-xs)] sm:flex-row sm:items-center">
          <span className="font-medium text-[var(--ds-text-muted)] sm:text-left">
            © {year} Visualify. All rights reserved.
          </span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-[var(--ds-space-4)] gap-y-1">
            <LegalDocumentLink document="privacy" className={linkClass}>
              Privacy Policy
            </LegalDocumentLink>
            <LegalDocumentLink document="terms" className={linkClass}>
              Terms &amp; Conditions
            </LegalDocumentLink>
          </nav>
        </div>
      </div>
    </footer>
  );
}
