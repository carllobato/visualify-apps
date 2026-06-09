import { Trend } from "@visualify/design-system";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import {
  REPORT_OVERVIEW_METRIC_DOT_CLASS,
  REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS,
  REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS,
  REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
} from "@/lib/projects/report-project-overview-link";
import {
  getReportProjectTopRiskRagStatus,
  sortReportProjectTopRisksByRagStatus,
  type ReportProjectTopRisk,
} from "@/lib/projects/report-project-top-risks";

type ReportProjectTopRisksCardProps = {
  risks: ReportProjectTopRisk[];
  expanded?: boolean;
  prominent?: boolean;
  highlighted?: boolean;
  rowHoverable?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const TOP_RISKS_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-2.5 text-[length:var(--ds-text-sm)] max-md:min-h-0 md:flex md:min-h-10 md:shrink-0 md:justify-between md:gap-4 md:py-0";

const TOP_RISKS_CATEGORY_CLASS =
  "inline-flex max-w-[9rem] shrink-0 items-center truncate rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 text-[10px] font-normal text-[var(--ds-text-muted)]";

const TOP_RISKS_TABULAR_CATEGORY_CLASS =
  "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 text-[10px] font-normal text-[var(--ds-text-muted)]";

const TOP_RISKS_TABULAR_SCROLL_CLASS =
  "min-w-0 overflow-x-auto max-md:overscroll-x-contain";

const TOP_RISKS_TABULAR_LIST_CLASS =
  "m-0 grid w-full list-none grid-cols-[minmax(10rem,14%)_max-content_minmax(0,1fr)_max-content] gap-x-4 p-0 max-md:min-w-[42rem] max-md:grid-cols-[10rem_max-content_minmax(14rem,1fr)_max-content]";

const TOP_RISKS_TABULAR_ROW_CLASS = [
  "col-span-full grid cursor-default grid-cols-subgrid items-start gap-x-4 border-b border-[var(--ds-border-subtle)] py-3 first:pt-0 last:border-b-0",
  REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS,
].join(" ");

const TOP_RISKS_TABULAR_HEADER_CLASS =
  "col-span-full grid grid-cols-subgrid items-center gap-x-4 border-b border-[var(--ds-border-subtle)] pb-2 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";

function ReportProjectTopRiskIndicators({ risk }: { risk: ReportProjectTopRisk }) {
  return (
    <span className={`${REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS} shrink-0`}>
      <span className={REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS}>
        <ReportRagStatusDot
          status={getReportProjectTopRiskRagStatus(risk)}
          dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS}
        />
      </span>
      <Trend sentiment={risk.trend.sentiment} className="max-md:opacity-80">
        {risk.trend.text}
      </Trend>
    </span>
  );
}

function ReportProjectTopRisksTabularList({ risks }: { risks: ReportProjectTopRisk[] }) {
  return (
    <div className={TOP_RISKS_TABULAR_SCROLL_CLASS}>
      <ul className={TOP_RISKS_TABULAR_LIST_CLASS}>
        <li className={TOP_RISKS_TABULAR_HEADER_CLASS} aria-hidden="true">
          <span>Issue</span>
          <span>Category</span>
          <span>Description</span>
          <span className="text-right">Status</span>
        </li>
        {risks.map((risk) => (
          <li key={risk.id} className={TOP_RISKS_TABULAR_ROW_CLASS}>
            <p className="m-0 min-w-0 text-[length:var(--ds-text-sm)] font-medium leading-snug text-[var(--ds-text-primary)]">
              {risk.title}
            </p>
            <span className={TOP_RISKS_TABULAR_CATEGORY_CLASS} title={risk.category}>
              {risk.category}
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
                {risk.description}
              </p>
              {risk.comment ? (
                <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
                  {risk.comment}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5">
              <ReportRagStatusDot
                status={getReportProjectTopRiskRagStatus(risk)}
                dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS}
              />
              <Trend sentiment={risk.trend.sentiment} className="text-[length:var(--ds-text-sm)]">
                {risk.trend.text}
              </Trend>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportProjectTopRisksExpandedList({
  risks,
  prominent = false,
}: {
  risks: ReportProjectTopRisk[];
  prominent?: boolean;
}) {
  if (prominent) {
    return <ReportProjectTopRisksTabularList risks={risks} />;
  }

  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
      {risks.map((risk) => (
        <li key={risk.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p className="m-0 min-w-0 text-[length:var(--ds-text-sm)] font-medium text-[var(--ds-text-primary)]">
              {risk.title}
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className={TOP_RISKS_CATEGORY_CLASS} title={risk.category}>
                {risk.category}
              </span>
              <ReportRagStatusDot
                status={getReportProjectTopRiskRagStatus(risk)}
                dotClassName={REPORT_OVERVIEW_METRIC_DOT_CLASS}
              />
              <Trend sentiment={risk.trend.sentiment}>{risk.trend.text}</Trend>
            </div>
          </div>
          {risk.comment ? (
            <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
              {risk.comment}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ReportProjectTopRisksList({
  risks,
  expanded = false,
  prominent = false,
  rowHoverable = false,
  onNavigate,
}: {
  risks: ReportProjectTopRisk[];
  expanded?: boolean;
  prominent?: boolean;
  rowHoverable?: boolean;
  onNavigate?: () => void;
}) {
  const compactRowClassName = [
    TOP_RISKS_ROW_CLASS,
    rowHoverable ? REPORT_PROJECT_TAB_ROW_INTERACTIVE_CLASS : "",
    rowHoverable && onNavigate ? "pointer-events-auto cursor-pointer" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const compactRowProps =
    rowHoverable && onNavigate
      ? ({ onClick: onNavigate } as const)
      : undefined;

  if (expanded) {
    return <ReportProjectTopRisksExpandedList risks={risks} prominent={prominent} />;
  }

  return (
    <ul className="m-0 flex shrink-0 list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
      {risks.map((risk) => (
        <li key={risk.id} className={compactRowClassName} {...compactRowProps}>
          <span className="min-w-0 truncate text-[var(--ds-text-primary)] md:min-w-0 md:flex-1">
            {risk.title}
          </span>
          <span
            className={`${TOP_RISKS_CATEGORY_CLASS} max-md:hidden md:inline-flex`}
            title={risk.category}
          >
            {risk.category}
          </span>
          <ReportProjectTopRiskIndicators risk={risk} />
        </li>
      ))}
    </ul>
  );
}

export function ReportProjectTopRisksCard({
  risks,
  expanded = false,
  prominent = false,
  highlighted = false,
  rowHoverable = false,
  onNavigate,
  navigateLabel,
}: ReportProjectTopRisksCardProps) {
  const sortedRisks = sortReportProjectTopRisksByRagStatus(risks);

  if (expanded) {
    return (
      <ReportProjectOverviewInteractiveCard
        hoverable
        highlighted={highlighted}
        contentClassName={prominent ? "flex flex-1 flex-col px-4 py-4" : "flex flex-1 flex-col px-4 py-3"}
      >
        <p
          className={[
            "m-0 mb-3 shrink-0 text-[var(--ds-text-primary)]",
            prominent ? "text-[length:var(--ds-text-base)] font-semibold" : "text-[length:var(--ds-text-sm)] font-semibold",
          ].join(" ")}
        >
          Key issues & risks
        </p>
        <ReportProjectTopRisksList risks={sortedRisks} expanded prominent={prominent} />
      </ReportProjectOverviewInteractiveCard>
    );
  }

  const list = (
    <>
      <ReportProjectOverviewCardHeader title="Key issues & risks" />
      <div className="flex min-h-0 flex-1 flex-col">
        <ReportProjectTopRisksList risks={sortedRisks} expanded={expanded} prominent={prominent} rowHoverable={rowHoverable} onNavigate={onNavigate} />
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </>
  );

  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
      cardClassName="overflow-visible"
      contentClassName="flex flex-1 flex-col overflow-visible px-3 py-3 sm:px-4"
    >
      {list}
    </ReportProjectOverviewInteractiveCard>
  );
}
