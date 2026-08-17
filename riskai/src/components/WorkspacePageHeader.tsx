"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortfolioReportingMonthSelect } from "@/components/PortfolioReportingMonthSelect";
import {
  isWorkspaceOverviewPathname,
  riskaiPath,
  workspaceRouteTitleFromPathname,
} from "@/lib/routes";
import { usePageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";

const linkClass =
  "text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)] no-underline transition-[color,text-decoration-color] duration-[var(--ds-transition-fast)] ease-in-out " +
  "hover:text-[var(--ds-text-secondary)] hover:underline " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-default)] " +
  "rounded-[var(--ds-radius-sm)]";

const titleSeparatorClass =
  "ds-page-header-separator shrink-0 px-[var(--ds-space-2)] text-[length:var(--ds-text-xl)] text-[var(--ds-text-muted)]";

type WorkspacePageHeaderProps = {
  workspaceId: string;
  workspaceName: string;
  /** Workspace Project IDs for the reporting-month selector (includes unlinked Projects). */
  projectIds: readonly string[];
  /** From `x-url-search` (middleware); keeps reporting month control stable across client navigations. */
  initialUrlSearch: string;
};

/**
 * Shell header for `/workspaces/[workspaceId]/…`: `Workspace name | Page`.
 * Known segments use {@link workspaceRouteTitleFromPathname} so the suffix updates with the URL.
 */
export function WorkspacePageHeader({
  workspaceId,
  workspaceName,
  projectIds,
  initialUrlSearch,
}: WorkspacePageHeaderProps) {
  const pathname = usePathname();
  const { extras } = usePageHeaderExtras();
  const fromPath = workspaceRouteTitleFromPathname(pathname, workspaceId);
  const titleSuffix =
    fromPath ?? (extras?.titleSuffix?.trim() ? extras.titleSuffix : null);
  const showReportMonth = isWorkspaceOverviewPathname(pathname, workspaceId);

  return (
    <>
      <header className="flex min-h-[61px] shrink-0 items-center justify-between gap-[var(--ds-space-4)] px-[var(--ds-space-6)]">
        <h1 className="m-0 flex min-w-0 flex-1 items-center gap-[var(--ds-space-1)] text-[length:var(--ds-text-xl)] font-semibold text-[var(--ds-text-primary)]">
          <Link
            href={riskaiPath(`/workspaces/${workspaceId}`)}
            className={linkClass + " min-w-0 w-fit max-w-[min(100%,28rem)] shrink truncate"}
          >
            {workspaceName}
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
          {showReportMonth ? (
            <PortfolioReportingMonthSelect
              projectIds={projectIds}
              initialUrlSearch={initialUrlSearch}
            />
          ) : null}
        </div>
      </header>
      <div className="w-full shrink-0 px-[var(--ds-space-6)]">
        <div className="h-px w-full bg-[var(--ds-border-subtle)]" aria-hidden />
      </div>
    </>
  );
}
