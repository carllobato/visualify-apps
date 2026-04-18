"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortfolioReportingMonthSelect } from "@/components/PortfolioReportingMonthSelect";
import { portfolioRouteTitleFromPathname, riskaiPath } from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";

const linkClass =
  "text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)] no-underline transition-[color,text-decoration-color] duration-[var(--ds-transition-fast)] ease-in-out " +
  "hover:text-[var(--ds-text-secondary)] hover:underline " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)] " +
  "rounded-[var(--ds-radius-sm)]";

const titleSeparatorClass =
  "ds-page-header-separator shrink-0 px-[var(--ds-space-2)] text-[length:var(--ds-text-xl)] text-[var(--ds-text-muted)]";

type PortfolioPageHeaderProps = {
  portfolioId: string;
  portfolioName: string;
  /** From `x-url-search` (middleware); keeps reporting month control stable across client navigations. */
  initialUrlSearch: string;
};

/**
 * Shell header for portfolio routes: `Portfolio name | Page`.
 * Known segments use {@link portfolioRouteTitleFromPathname} so the suffix updates with the URL
 * immediately; `extras.titleSuffix` is a fallback for other subpaths (via RegisterPageHeaderTitle, etc.).
 */
export function PortfolioPageHeader({
  portfolioId,
  portfolioName,
  initialUrlSearch,
}: PortfolioPageHeaderProps) {
  const pathname = usePathname();
  const { extras } = usePageHeaderExtras();
  const fromPath = portfolioRouteTitleFromPathname(pathname, portfolioId);
  const titleSuffix =
    fromPath ?? (extras?.titleSuffix?.trim() ? extras.titleSuffix : null);

  return (
    <>
      <header className="flex min-h-[61px] shrink-0 items-center justify-between gap-[var(--ds-space-4)] px-[var(--ds-space-6)]">
        <h1 className="m-0 flex min-w-0 flex-1 items-center gap-[var(--ds-space-1)] text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          <Link
            href={riskaiPath(`/portfolios/${portfolioId}`)}
            className={linkClass + " min-w-0 w-fit max-w-[min(100%,28rem)] shrink truncate"}
          >
            {portfolioName}
          </Link>
          {titleSuffix ? (
            <>
              <span className={titleSeparatorClass} aria-hidden>
                |
              </span>
              <span className="shrink-0 text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
                {titleSuffix}
              </span>
            </>
          ) : null}
        </h1>
        <div className="flex shrink-0 items-center gap-[var(--ds-space-3)]">
          {extras?.end ? (
            <div className="flex max-w-[min(100%,20rem)] shrink flex-col gap-[var(--ds-space-1)] text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)] sm:items-end sm:text-right">
              {extras.end}
            </div>
          ) : null}
          <PortfolioReportingMonthSelect
            portfolioId={portfolioId}
            initialUrlSearch={initialUrlSearch}
          />
        </div>
      </header>
      <div className="w-full shrink-0 px-[var(--ds-space-6)]">
        <div className="h-px w-full bg-[var(--ds-border-subtle)]" aria-hidden />
      </div>
    </>
  );
}
