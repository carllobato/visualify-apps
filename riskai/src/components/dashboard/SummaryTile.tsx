import Link from "next/link";
import type { RagStatus } from "@/lib/dashboard/projectTileServerData";

function ragDotClass(status: RagStatus): string {
  switch (status) {
    case "green":
      return "bg-[var(--ds-status-success)]";
    case "amber":
      return "bg-[var(--ds-status-warning)]";
    case "red":
      return "bg-[var(--ds-status-danger)]";
    default:
      return "bg-[var(--ds-status-neutral)]";
  }
}

function ragWord(status: RagStatus): string {
  switch (status) {
    case "green":
      return "Green";
    case "amber":
      return "Amber";
    case "red":
      return "Red";
    default:
      return "";
  }
}

type SummaryTileProps = {
  title: string;
  primaryValue: string;
  tooltip?: {
    title: string;
    body: string;
  };
  /** Optional class for the primary value (e.g. semantic RAG colour). */
  primaryValueClassName?: string;
  /** Optional RAG dot before the primary value (same pattern as KPI modal `OverallRagCell`). */
  primaryRagDot?: RagStatus;
  /** Secondary trend line (global CSS classes only — see `.ds-trend-line` in app `globals.css`). */
  trend?: { text: string; className: string };
  subtext?: string;
  /** When set, the whole tile navigates (e.g. portfolio KPI → related route). Ignored if `onActivate` is set. */
  href?: string;
  /** Opens detail overlay (e.g. KPI modal); use with parent-managed modal instead of direct navigation. */
  onActivate?: () => void;
  /** Primary outline while a detail modal is open (see `.ds-document-tile-panel--modal-selected` in DS globals). */
  selected?: boolean;
};

/** Tall enough for title + 2-line primary + trend + 2-line subtext when the grid column narrows (e.g. sidebar open). */
const tileClass =
  "ds-document-tile-panel ds-document-tile-panel--interactive p-4 flex flex-col min-h-32 min-w-0";

const titleClass =
  "text-sm font-medium text-[var(--ds-text-secondary)] m-0 mb-1";
const primaryClass =
  "text-2xl font-semibold text-[var(--ds-text-primary)] m-0 tracking-tight line-clamp-2 break-words";
const subtextClass =
  "text-xs text-[var(--ds-text-muted)] mt-1 m-0 min-w-0 line-clamp-2 break-words";
const trendExtraClass = "min-w-0 line-clamp-2 break-words";

const interactiveFocusClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-app-document-bg)]";

function TileTitle({ title, tooltip }: { title: string; tooltip?: SummaryTileProps["tooltip"] }) {
  if (tooltip == null) {
    return <span className={titleClass}>{title}</span>;
  }

  const tooltipText = `${tooltip.title}\n\n${tooltip.body}`;
  return (
    <span className={`${titleClass} inline-flex items-center gap-1.5`}>
      <span>{title}</span>
      <span className="group relative inline-flex" title={tooltipText}>
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--ds-border-subtle)] text-[10px] leading-none text-[var(--ds-text-muted)]"
          aria-label={tooltipText}
        >
          i
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-64 -translate-x-1/2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-[var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] group-hover:block"
        >
          <span className="block font-semibold text-[var(--ds-text-primary)]">{tooltip.title}</span>
          <span className="mt-1 block leading-snug">{tooltip.body}</span>
        </span>
      </span>
    </span>
  );
}

/**
 * KPI summary tile: title, large primary value, optional contextual subtext.
 */
export function SummaryTile({
  title,
  primaryValue,
  tooltip,
  primaryValueClassName,
  primaryRagDot,
  trend,
  subtext,
  href,
  onActivate,
  selected = false,
}: SummaryTileProps) {
  const primaryCombined =
    primaryValueClassName != null && primaryValueClassName !== ""
      ? `${primaryClass} ${primaryValueClassName}`
      : primaryClass;
  const primaryRow =
    primaryRagDot != null ? (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        <span
          className="inline-flex items-center shrink-0"
          title={`RAG ${ragWord(primaryRagDot)}`}
          aria-label={`RAG ${ragWord(primaryRagDot)}`}
        >
          <span
            className={`size-[0.6875rem] shrink-0 rounded-full ${ragDotClass(primaryRagDot)}`}
            aria-hidden
          />
        </span>
        <span className={`${primaryCombined} min-w-0`}>{primaryValue}</span>
      </span>
    ) : (
      <span className={primaryCombined}>{primaryValue}</span>
    );
  if (onActivate != null) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={`${tileClass}${
          selected ? " ds-document-tile-panel--modal-selected" : ""
        } w-full text-left cursor-pointer border-0 bg-[var(--ds-document-tile-bg)] font-inherit ${interactiveFocusClass}`}
        aria-label={`View ${title} details`}
      >
        <TileTitle title={title} tooltip={tooltip} />
        {primaryRow}
        {trend != null && trend.text !== "" ? (
          <span className={`${trend.className} ${trendExtraClass}`}>{trend.text}</span>
        ) : null}
        {subtext != null && subtext !== "" && <span className={subtextClass}>{subtext}</span>}
      </button>
    );
  }

  if (href != null && href !== "") {
    return (
      <Link
        href={href}
        className={`${tileClass} block no-underline text-inherit ${interactiveFocusClass}`}
        aria-label={`View ${title}`}
      >
        <TileTitle title={title} tooltip={tooltip} />
        {primaryRow}
        {trend != null && trend.text !== "" ? (
          <span className={`${trend.className} ${trendExtraClass}`}>{trend.text}</span>
        ) : null}
        {subtext != null && subtext !== "" && <span className={subtextClass}>{subtext}</span>}
      </Link>
    );
  }

  return (
    <div className={tileClass}>
      <TileTitle title={title} tooltip={tooltip} />
      {primaryRow}
      {trend != null && trend.text !== "" ? (
        <span className={`${trend.className} ${trendExtraClass}`}>{trend.text}</span>
      ) : null}
      {subtext != null && subtext !== "" && <p className={subtextClass}>{subtext}</p>}
    </div>
  );
}
