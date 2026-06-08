import { Card, CardContent } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import {
  partitionReportProjectSafetyStats,
  type ReportProjectSafetyStat,
} from "@/lib/projects/report-project-safety-stats";

type ReportProjectSafetyStatsCardProps = {
  stats: ReportProjectSafetyStat[];
  presentation?: "rows" | "kpi";
  /** Match category row count so paired overview cards share aligned row heights. */
  alignedRowCount?: number;
};

function ReportProjectSafetyStatKpiValue({ stat }: { stat: ReportProjectSafetyStat }) {
  if (stat.display === "rag") {
    return (
      <ReportRagStatusDot status={stat.value} showPhrase compact className="mt-1" />
    );
  }

  return (
    <p className="m-0 mt-1 text-[length:var(--ds-text-2xl)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
      {stat.value}
    </p>
  );
}

function ReportProjectSafetyStatsKpiGrid({ stats }: { stats: ReportProjectSafetyStat[] }) {
  const { primary, secondary } = partitionReportProjectSafetyStats(stats);

  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <p className="m-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
        Safety stats
      </p>
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((stat) => (
          <Card key={stat.label} className="h-full w-full min-w-0">
            <CardContent className="px-4 py-3">
              <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
                {stat.label}
              </p>
              <ReportProjectSafetyStatKpiValue stat={stat} />
            </CardContent>
          </Card>
        ))}
      </div>
      {secondary.length > 0 ? (
        <div className="flex min-w-0 w-full flex-col gap-2 rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] px-3 py-2.5">
          <p className="m-0 text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
            Incidents by WPS
          </p>
          <div className="grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-3">
            {secondary.map((stat) => (
              <div
                key={stat.label}
                className="flex min-w-0 items-baseline justify-between gap-3 text-[length:var(--ds-text-sm)] sm:flex-col sm:items-start sm:gap-0.5"
              >
                <span className="text-[var(--ds-text-muted)]">{stat.label}</span>
                <span className="font-semibold tabular-nums text-[var(--ds-text-secondary)]">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReportProjectSafetyStatsCard({
  stats,
  presentation = "rows",
  alignedRowCount = stats.length,
}: ReportProjectSafetyStatsCardProps) {
  if (presentation === "kpi") {
    return <ReportProjectSafetyStatsKpiGrid stats={stats} />;
  }

  const spacerCount = Math.max(0, alignedRowCount - stats.length);

  return (
    <Card className="flex h-full w-full min-w-0 flex-col">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Safety
        </p>
        <dl className="m-0 flex min-h-0 flex-1 flex-col">
          {stats.map((stat, index) => {
            const rowDivider =
              index > 0 ? "border-t border-[var(--ds-border-subtle)] pt-1.5" : "";
            const rowPadding = "pb-1.5";

            return (
              <div
                key={stat.label}
                className={`flex min-h-0 flex-1 items-center justify-between gap-4 text-[length:var(--ds-text-sm)] ${rowDivider} ${rowPadding}`}
              >
                <dt className="m-0 min-w-0 text-[var(--ds-text-secondary)]">{stat.label}</dt>
                <dd className="m-0 shrink-0 font-semibold tabular-nums text-[var(--ds-text-primary)]">
                  {stat.display === "rag" ? <ReportRagStatusDot status={stat.value} /> : stat.value}
                </dd>
              </div>
            );
          })}
          {Array.from({ length: spacerCount }, (_, index) => (
            <div key={`spacer-${index}`} className="min-h-0 flex-1" aria-hidden />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
