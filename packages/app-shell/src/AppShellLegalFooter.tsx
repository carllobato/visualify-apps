import type { ReactNode } from "react";
import "./app-shell-legal-footer.css";

export type AppShellLegalFooterProps = {
  privacyHref: string;
  termsHref: string;
  /** Copyright year; defaults to current calendar year. */
  year?: number;
  /** Extra classes on the root `footer` element. */
  className?: string;
  /** Optional slot after copyright (e.g. extra links). */
  trailing?: ReactNode;
};

/**
 * Presentational privacy/terms + copyright row.
 * Callers supply absolute or app-relative `href`s (no origin logic in this package).
 * Structure matches HQ `SiteLegalFooter`; RiskAI may pass different `className` for padding.
 */
export function AppShellLegalFooter({
  privacyHref,
  termsHref,
  year = new Date().getFullYear(),
  className,
  trailing,
}: AppShellLegalFooterProps) {
  const rootClass = ["vf-app-shell-legal-footer", className].filter(Boolean).join(" ");

  return (
    <footer className={rootClass}>
      <div className="ds-site-footer-inner vf-app-shell-legal-footer-bar">
        <div className="vf-app-shell-legal-footer-content">
          <nav aria-label="Footer" className="vf-app-shell-legal-footer-nav">
            <a href={privacyHref} className="vf-app-shell-legal-footer-link">
              Privacy Policy
            </a>
            <span className="vf-app-shell-legal-footer-sep" aria-hidden>
              |
            </span>
            <a href={termsHref} className="vf-app-shell-legal-footer-link">
              Terms & Conditions
            </a>
          </nav>
          <span className="vf-app-shell-legal-footer-sep" aria-hidden>
            |
          </span>
          <span className="vf-app-shell-legal-footer-copy">© {year} Visualify. All rights reserved.</span>
          {trailing != null ? trailing : null}
        </div>
      </div>
    </footer>
  );
}
