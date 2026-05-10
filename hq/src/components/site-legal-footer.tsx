import { VISUALIFY_APP_ORIGIN } from "@/lib/visualify-apps";

const linkClass =
  "text-[var(--ds-text-tertiary)] transition-colors hover:text-[var(--ds-text-secondary)]";

/** Matches RiskAI app shell footer; links use the shared app origin for privacy/terms routes. */
export function SiteLegalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 bg-transparent">
      <div className="ds-site-footer-inner flex items-center border-t border-[var(--ds-border-subtle)] py-1">
        <div className="flex flex-wrap items-center gap-y-0.5 leading-tight text-[length:var(--ds-text-xs)] text-[var(--ds-text-tertiary)]">
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-y-0.5">
            <a href={`${VISUALIFY_APP_ORIGIN}/privacy`} className={linkClass}>
              Privacy Policy
            </a>
            <span className="px-2 text-[var(--ds-text-tertiary)]" aria-hidden>
              |
            </span>
            <a href={`${VISUALIFY_APP_ORIGIN}/terms`} className={linkClass}>
              Terms &amp; Conditions
            </a>
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
