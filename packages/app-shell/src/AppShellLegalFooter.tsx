import type { ReactNode } from "react";
import "./app-shell-legal-footer.css";

export type AppShellLegalFooterProps = {
  /** Plain link target when `privacyLink` is omitted. */
  privacyHref?: string;
  /** Plain link target when `termsLink` is omitted. */
  termsHref?: string;
  /** Custom privacy control (e.g. modal trigger); uses shared footer link chrome when className is omitted. */
  privacyLink?: ReactNode;
  /** Custom terms control (e.g. modal trigger). */
  termsLink?: ReactNode;
  /** Link label for `privacyHref`. */
  privacyLabel?: string;
  /** Link label for `termsHref`. */
  termsLabel?: string;
  /** Entity name in the copyright line (`© {year} {copyrightHolder}. …`). */
  copyrightHolder?: string;
  /** Copyright year; defaults to current calendar year. */
  year?: number;
  /** Extra classes on the root `footer` element. */
  className?: string;
  /** Optional slot after copyright (e.g. extra links). */
  trailing?: ReactNode;
};

/**
 * Presentational privacy/terms + copyright row.
 * Supply `privacyHref`/`termsHref` or custom `privacyLink`/`termsLink` nodes; no routing in this package.
 */
export function AppShellLegalFooter({
  privacyHref,
  termsHref,
  privacyLink,
  termsLink,
  privacyLabel = "Privacy Policy",
  termsLabel = "Terms & Conditions",
  copyrightHolder = "Visualify",
  year = new Date().getFullYear(),
  className,
  trailing,
}: AppShellLegalFooterProps) {
  const rootClass = ["vf-app-shell-legal-footer", className].filter(Boolean).join(" ");

  const privacyControl =
    privacyLink ??
    (privacyHref != null ? (
      <a href={privacyHref} className="vf-app-shell-legal-footer-link">
        {privacyLabel}
      </a>
    ) : null);

  const termsControl =
    termsLink ??
    (termsHref != null ? (
      <a href={termsHref} className="vf-app-shell-legal-footer-link">
        {termsLabel}
      </a>
    ) : null);

  return (
    <footer className={rootClass}>
      <div className="vf-app-shell-legal-footer-bar">
        <div className="vf-app-shell-legal-footer-content">
          <nav aria-label="Footer" className="vf-app-shell-legal-footer-nav">
            {privacyControl}
            <span className="vf-app-shell-legal-footer-sep" aria-hidden>
              |
            </span>
            {termsControl}
          </nav>
          <span className="vf-app-shell-legal-footer-sep" aria-hidden>
            |
          </span>
          <span className="vf-app-shell-legal-footer-copy">
            © {year} {copyrightHolder}. All rights reserved.
          </span>
          {trailing != null ? trailing : null}
        </div>
      </div>
    </footer>
  );
}
