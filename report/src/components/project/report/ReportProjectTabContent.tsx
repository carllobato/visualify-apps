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

export function ReportProjectTabContent({ project: _project }: ReportProjectTabContentProps) {
  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-col lg:w-1/3">
          <ReportProjectKeyMetricsCard metrics={REPORT_PROJECT_KEY_METRICS_PLACEHOLDER} />
        </div>
        <div className="flex min-w-0 flex-col lg:w-2/3">
          <ReportProjectSafetyStatsCard stats={REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER} />
        </div>
      </div>
      <ReportProjectKeyMilestonesCard milestones={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER} />
      <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-col lg:w-1/2">
          <ReportProjectKeyCategoriesCard categories={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER} />
        </div>
        <div className="flex min-w-0 flex-col lg:w-1/2">
          <ReportProjectTopRisksCard risks={REPORT_PROJECT_TOP_RISKS_PLACEHOLDER} expanded />
        </div>
      </div>
    </div>
  );
}
