import { Card, CardContent, Trend } from "@visualify/design-system";
import { ReportProjectOverviewCardHeader } from "@/components/project/report/ReportProjectOverviewCardHeader";
import { ReportProjectOverviewInteractiveCard } from "@/components/project/report/ReportProjectOverviewInteractiveCard";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import {
  REPORT_OVERVIEW_METRIC_DOT_CLASS,
  REPORT_OVERVIEW_METRIC_INDICATOR_SLOT_CLASS,
  REPORT_OVERVIEW_METRIC_VALUE_ROW_CLASS,
} from "@/lib/projects/report-project-overview-link";
import {
  getReportProjectTopRiskCallout,
  getReportProjectTopRiskRagStatus,
  type ReportProjectTopRisk,
} from "@/lib/projects/report-project-top-risks";

type ReportProjectTopRisksCardProps = {
  risks: ReportProjectTopRisk[];
  expanded?: boolean;
  prominent?: boolean;
  highlighted?: boolean;
  onNavigate?: () => void;
  navigateLabel?: string;
};

const TOP_RISKS_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-2.5 text-[length:var(--ds-text-sm)] max-md:min-h-0 md:flex md:min-h-10 md:shrink-0 md:justify-between md:gap-4 md:py-0";

const TOP_RISKS_CALLOUT_CLASS =
  "pointer-events-none absolute left-0 z-20 hidden w-72 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-3 py-2 text-left text-[length:var(--ds-text-xs)] font-normal normal-case tracking-normal text-[var(--ds-text-secondary)] shadow-[var(--ds-shadow-sm)] group-hover/title:block group-focus-within/title:block";

const TOP_RISKS_CATEGORY_CLASS =
  "inline-flex max-w-[9rem] shrink-0 items-center truncate rounded-full border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] px-2 py-0.5 text-[10px] font-normal text-[var(--ds-text-muted)]";

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

function ReportProjectTopRisksExpandedList({
  risks,
  prominent = false,
}: {
  risks: ReportProjectTopRisk[];
  prominent?: boolean;
}) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
      {risks.map((risk) => (
        <li
          key={risk.id}
          className={prominent ? "py-3.5 first:pt-0 last:pb-0" : "py-2.5 first:pt-0 last:pb-0"}
        >
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <p
              className={[
                "m-0 min-w-0 text-[var(--ds-text-primary)]",
                prominent ? "text-[length:var(--ds-text-base)] font-semibold" : "text-[length:var(--ds-text-sm)] font-medium",
              ].join(" ")}
            >
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
          <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
            <span className="font-medium text-[var(--ds-text-muted)]">Mitigation / action: </span>
            {risk.comment}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ReportProjectTopRisksList({
  risks,
  expanded = false,
  prominent = false,
}: {
  risks: ReportProjectTopRisk[];
  expanded?: boolean;
  prominent?: boolean;
}) {
  if (expanded) {
    return <ReportProjectTopRisksExpandedList risks={risks} prominent={prominent} />;
  }

  return (
    <ul className="m-0 flex shrink-0 list-none flex-col divide-y divide-[var(--ds-border-subtle)] p-0">
      {risks.map((risk, index) => {
        const callout = getReportProjectTopRiskCallout(risk);
        const calloutId = `top-risk-${risk.id}-callout`;
        const calloutText = `${callout.title}\n\n${callout.body}`;
        const showCalloutAbove = index >= risks.length - 2;

        return (
          <li key={risk.id} className={TOP_RISKS_ROW_CLASS}>
            <span
              className="group/title relative min-w-0 cursor-help pointer-events-auto md:min-w-0 md:flex-1"
              tabIndex={0}
              title={calloutText}
              aria-describedby={calloutId}
            >
              <span className="block truncate text-[var(--ds-text-primary)]">{risk.title}</span>
              <div
                id={calloutId}
                role="tooltip"
                className={[
                  TOP_RISKS_CALLOUT_CLASS,
                  showCalloutAbove ? "bottom-full mb-1" : "top-full mt-1",
                ].join(" ")}
              >
                <p className="m-0 font-semibold text-[var(--ds-text-primary)]">{callout.title}</p>
                <p className="m-0 mt-1 leading-snug">{callout.body}</p>
              </div>
            </span>
            <span
              className={`${TOP_RISKS_CATEGORY_CLASS} max-md:hidden md:inline-flex`}
              title={risk.category}
            >
              {risk.category}
            </span>
            <ReportProjectTopRiskIndicators risk={risk} />
          </li>
        );
      })}
    </ul>
  );
}

export function ReportProjectTopRisksCard({
  risks,
  expanded = false,
  prominent = false,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectTopRisksCardProps) {
  if (expanded) {
    return (
      <Card className="flex h-full w-full min-w-0 flex-col">
        <CardContent className={prominent ? "flex flex-1 flex-col px-4 py-4" : "flex flex-1 flex-col px-4 py-3"}>
          <p
            className={[
              "m-0 mb-3 shrink-0 text-[var(--ds-text-primary)]",
              prominent ? "text-[length:var(--ds-text-base)] font-semibold" : "text-[length:var(--ds-text-sm)] font-semibold",
            ].join(" ")}
          >
            Key issues & risks
          </p>
          <ReportProjectTopRisksList risks={risks} expanded prominent={prominent} />
        </CardContent>
      </Card>
    );
  }

  const list = (
    <>
      <ReportProjectOverviewCardHeader title="Key issues & risks" />
      <div className="flex min-h-0 flex-1 flex-col">
        <ReportProjectTopRisksList risks={risks} expanded={expanded} prominent={prominent} />
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
