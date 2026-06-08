import { Trend } from "@visualify/design-system";
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

export function ReportProjectTopRisksCard({
  risks,
  highlighted = false,
  onNavigate,
  navigateLabel,
}: ReportProjectTopRisksCardProps) {
  return (
    <ReportProjectOverviewInteractiveCard
      highlighted={highlighted}
      onNavigate={onNavigate}
      navigateLabel={navigateLabel}
      cardClassName="overflow-visible"
      contentClassName="flex flex-1 flex-col overflow-visible px-3 py-3 sm:px-4"
    >
      <ReportProjectOverviewCardHeader title="Key issues & risks" />
      <div className="flex min-h-0 flex-1 flex-col">
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
                    <p className="m-0 font-semibold text-[var(--ds-text-primary)]">
                      {callout.title}
                    </p>
                    <p className="m-0 mt-1 leading-snug">{callout.body}</p>
                  </div>
                </span>
                <span className={`${TOP_RISKS_CATEGORY_CLASS} max-md:hidden md:inline-flex`} title={risk.category}>
                  {risk.category}
                </span>
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
              </li>
            );
          })}
        </ul>
        <div className="min-h-0 flex-1" aria-hidden="true" />
      </div>
    </ReportProjectOverviewInteractiveCard>
  );
}
