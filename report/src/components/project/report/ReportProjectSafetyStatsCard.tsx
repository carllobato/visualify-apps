import { Card, CardContent } from "@visualify/design-system";
import { ReportRagStatusDot } from "@/components/project/report/ReportRagStatusDot";
import type { ReportProjectSafetyStat } from "@/lib/projects/report-project-safety-stats";

type ReportProjectSafetyStatsCardProps = {
  stats: ReportProjectSafetyStat[];
  /** Match category row count so paired overview cards share aligned row heights. */
  alignedRowCount?: number;
};

export function ReportProjectSafetyStatsCard({
  stats,
  alignedRowCount = stats.length,
}: ReportProjectSafetyStatsCardProps) {
  const spacerCount = Math.max(0, alignedRowCount - stats.length);

  return (
    <Card className="flex h-full w-full min-w-0 flex-col">
      <CardContent className="flex flex-1 flex-col px-4 py-3">
        <p className="m-0 mb-2 shrink-0 text-[length:var(--ds-text-sm)] font-semibold text-[var(--ds-text-primary)]">
          Safety stats
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
