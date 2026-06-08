import type { ReactNode } from "react";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMetricsCard } from "@/components/project/report/ReportProjectKeyMetricsCard";
import { ReportProjectKeyMilestonesCard } from "@/components/project/report/ReportProjectKeyMilestonesCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { ReportProjectTopRisksCard } from "@/components/project/report/ReportProjectTopRisksCard";
import { REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_KEY_METRICS_PLACEHOLDER } from "@/lib/projects/report-project-key-metrics";
import { REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER } from "@/lib/projects/report-project-key-milestones";
import { REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER } from "@/lib/projects/report-project-safety-stats";
import { REPORT_PROJECT_TOP_RISKS_PLACEHOLDER } from "@/lib/projects/report-project-top-risks";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

type ReportProjectTabContentProps = {
  project: ReportProjectListItem;
};

function ReportProjectTabSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={["flex min-w-0 w-full flex-col gap-3", className].join(" ")}>{children}</section>;
}

export function ReportProjectTabContent({ project: _project }: ReportProjectTabContentProps) {
  return (
    <div className="flex min-w-0 w-full flex-col gap-6">
      <ReportProjectTabSection>
        <ReportProjectKeyMetricsCard
          metrics={REPORT_PROJECT_KEY_METRICS_PLACEHOLDER}
          presentation="kpi"
        />
        <ReportProjectSafetyStatsCard
          stats={REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER}
          presentation="kpi"
        />
      </ReportProjectTabSection>

      <ReportProjectTabSection>
        <ReportProjectTopRisksCard risks={REPORT_PROJECT_TOP_RISKS_PLACEHOLDER} expanded prominent />
      </ReportProjectTabSection>

      <ReportProjectTabSection>
        <ReportProjectKeyMilestonesCard milestones={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER} />
      </ReportProjectTabSection>

      <ReportProjectTabSection>
        <ReportProjectKeyCategoriesCard categories={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER} />
      </ReportProjectTabSection>
    </div>
  );
}
