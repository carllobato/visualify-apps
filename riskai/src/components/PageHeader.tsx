"use client";

import Link from "next/link";
import { riskaiPath } from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";

const linkClass =
  "text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)] no-underline transition-[color,text-decoration-color] duration-[var(--ds-transition-fast)] ease-in-out " +
  "hover:text-[var(--ds-text-secondary)] hover:underline " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)] " +
  "rounded-[var(--ds-radius-sm)]";

const titleSeparatorClass =
  "ds-page-header-separator shrink-0 px-[var(--ds-space-2)] text-[length:var(--ds-text-xl)] text-[var(--ds-text-muted)]";

type PageHeaderProps = {
  projectId: string;
  projectName: string;
  portfolioId?: string | null;
  portfolioName?: string | null;
};

/**
 * Shell header for project routes. Breadcrumb-style title with `|` separators:
 * `Portfolio | Project | page` when linked to a portfolio, otherwise `Project | page`.
 * Portfolio and project segments are links; child routes register the page segment and optional
 * trailing content via `PageHeaderExtrasProvider`.
 */
export function PageHeader({
  projectId,
  projectName,
  portfolioId,
  portfolioName,
}: PageHeaderProps) {
  const { extras } = usePageHeaderExtras();

  return (
    <>
      <header className="flex min-h-[61px] shrink-0 items-center justify-between gap-[var(--ds-space-4)] px-[var(--ds-space-6)]">
        <h1 className="m-0 flex min-w-0 flex-1 items-center gap-[var(--ds-space-1)] text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          {portfolioName && portfolioId ? (
            <>
              <Link href={riskaiPath(`/portfolios/${portfolioId}`)} className={linkClass + " shrink-0"}>
                {portfolioName}
              </Link>
              <span className={titleSeparatorClass} aria-hidden>
                |
              </span>
              <Link
                href={riskaiPath(`/projects/${projectId}`)}
                className={
                  linkClass +
                  " min-w-0 w-fit max-w-[min(100%,28rem)] shrink truncate"
                }
              >
                {projectName}
              </Link>
            </>
          ) : (
            <Link
              href={riskaiPath(`/projects/${projectId}`)}
              className={
                linkClass + " min-w-0 w-fit max-w-[min(100%,28rem)] shrink truncate"
              }
            >
              {projectName}
            </Link>
          )}
          {extras?.titleSuffix ? (
            <>
              <span className={titleSeparatorClass} aria-hidden>
                |
              </span>
              <span className="shrink-0 text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
                {extras.titleSuffix}
              </span>
            </>
          ) : null}
        </h1>
        {extras?.end ? (
          <div className="flex shrink-0 flex-col gap-[var(--ds-space-1)] text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:items-end sm:text-right">
            {extras.end}
          </div>
        ) : null}
      </header>
      <div className="w-full shrink-0 px-[var(--ds-space-6)]">
        <div className="h-px w-full bg-[var(--ds-border-subtle)]" aria-hidden />
      </div>
    </>
  );
}
