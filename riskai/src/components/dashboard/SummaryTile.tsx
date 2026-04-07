import Link from "next/link";

type SummaryTileProps = {
  title: string;
  primaryValue: string;
  subtext?: string;
  /** When set, the whole tile navigates (e.g. portfolio KPI → related route). */
  href?: string;
};

const tileClass =
  "ds-document-tile-panel ds-document-tile-panel--interactive p-4 flex flex-col min-h-[88px]";

const titleClass =
  "text-sm font-medium text-[var(--ds-text-secondary)] m-0 mb-1";
const primaryClass =
  "text-2xl font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight";
const subtextClass = "text-xs text-[var(--ds-text-muted)] mt-1 m-0";

/**
 * KPI summary tile: title, large primary value, optional contextual subtext.
 */
export function SummaryTile({ title, primaryValue, subtext, href }: SummaryTileProps) {
  if (href != null && href !== "") {
    return (
      <Link
        href={href}
        className={`${tileClass} block no-underline text-inherit outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-app-document-bg)]`}
        aria-label={`View ${title}`}
      >
        <span className={titleClass}>{title}</span>
        <span className={primaryClass}>{primaryValue}</span>
        {subtext != null && subtext !== "" && <span className={subtextClass}>{subtext}</span>}
      </Link>
    );
  }

  return (
    <div className={tileClass}>
      <p className={titleClass}>{title}</p>
      <p className={primaryClass}>{primaryValue}</p>
      {subtext != null && subtext !== "" && <p className={subtextClass}>{subtext}</p>}
    </div>
  );
}
