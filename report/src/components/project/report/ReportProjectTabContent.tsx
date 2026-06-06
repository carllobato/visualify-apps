import { ReportProjectDetailsCard } from "@/components/project/report/ReportProjectDetailsCard";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMetricsCard } from "@/components/project/report/ReportProjectKeyMetricsCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_KEY_METRICS_PLACEHOLDER } from "@/lib/projects/report-project-key-metrics";
import { REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER } from "@/lib/projects/report-project-safety-stats";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

type ReportProjectTabContentProps = {
  project: ReportProjectListItem;
};

export function ReportProjectTabContent({ project }: ReportProjectTabContentProps) {
  return (
    <div className="flex min-w-0 w-full flex-col gap-3">
      <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-col lg:w-1/2">
          <ReportProjectKeyMetricsCard metrics={REPORT_PROJECT_KEY_METRICS_PLACEHOLDER} />
        </div>
        <div className="flex min-w-0 flex-col lg:w-1/2">
          <ReportProjectDetailsCard project={project} />
        </div>
      </div>
      <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-col lg:w-2/3">
          <ReportProjectKeyCategoriesCard categories={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER} />
        </div>
        <div className="flex min-w-0 flex-col lg:w-1/3">
          <ReportProjectSafetyStatsCard
            stats={REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER}
            alignedRowCount={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER.length}
          />
        </div>
      </div>
    </div>
  );
}
