import { GetHelpFooterLink } from "./GetHelpFooterLink";
import { LegalDocumentLink } from "./LegalDocumentLink";

const linkClass =
  "text-[var(--ds-text-tertiary)] transition-colors hover:text-[var(--ds-text-secondary)]";

export function SiteLegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 bg-transparent px-6">
      <div className="ds-site-footer-inner flex min-h-12 items-center border-t border-[var(--ds-border-subtle)]">
        <div className="flex flex-wrap items-center gap-y-1 text-[length:var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-y-1">
            <GetHelpFooterLink />
            <span className="px-2 text-[var(--ds-text-tertiary)]" aria-hidden>
              |
            </span>
            <LegalDocumentLink document="privacy" className={linkClass}>
              Privacy Policy
            </LegalDocumentLink>
            <span className="px-2 text-[var(--ds-text-tertiary)]" aria-hidden>
              |
            </span>
            <LegalDocumentLink document="terms" className={linkClass}>
              Terms &amp; Conditions
            </LegalDocumentLink>
          </nav>
          <span className="px-2 text-[var(--ds-text-tertiary)]" aria-hidden>
            |
          </span>
          <span className="text-[var(--ds-text-tertiary)]">
            © {year} Visualify. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
