"use client";

import Link from "next/link";
import { riskaiPath } from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";

const linkClass =
  "text-[var(--ds-text-primary)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ds-border)] focus:ring-offset-2 focus:ring-offset-[var(--ds-background)] rounded";

const titleSeparatorClass =
  "shrink-0 px-2 font-light text-[var(--ds-text-muted)]";

type PortfolioPageHeaderProps = {
  portfolioId: string;
  portfolioName: string;
};

/**
 * Shell header for portfolio routes: `Portfolio name | Page` when a child registers a title suffix.
 * Styling matches {@link PageHeader} for consistency.
 */
export function PortfolioPageHeader({ portfolioId, portfolioName }: PortfolioPageHeaderProps) {
  const { extras } = usePageHeaderExtras();

  return (
    <>
      <header className="min-h-[61px] flex items-center justify-between gap-4 px-6 shrink-0">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)] m-0 flex min-w-0 flex-1 items-center gap-1">
          <Link
            href={riskaiPath(`/portfolios/${portfolioId}`)}
            className={linkClass + " min-w-0 w-fit max-w-[min(100%,28rem)] shrink truncate"}
          >
            {portfolioName}
          </Link>
          {extras?.titleSuffix ? (
            <>
              <span className={titleSeparatorClass} aria-hidden>
                |
              </span>
              <span className="shrink-0 text-[var(--ds-text-primary)]">{extras.titleSuffix}</span>
            </>
          ) : null}
        </h1>
        {extras?.end ? (
          <div className="flex shrink-0 flex-col gap-1 text-sm text-[var(--ds-text-secondary)] sm:items-end sm:text-right">
            {extras.end}
          </div>
        ) : null}
      </header>
      <div className="w-full shrink-0 px-6">
        <div
          className="h-px w-full bg-[var(--ds-surface-muted)]"
          aria-hidden
        />
      </div>
    </>
  );
}
