import type { ReactNode } from "react";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMilestonesCard } from "@/components/project/report/ReportProjectKeyMilestonesCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER } from "@/lib/projects/report-project-key-milestones";
import { REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER } from "@/lib/projects/report-project-safety-stats";
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
        <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="flex min-w-0 flex-col lg:w-1/2">
            <ReportProjectKeyMilestonesCard milestones={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER} />
          </div>
          <div className="flex min-w-0 flex-col lg:w-1/2">
            <ReportProjectSafetyStatsCard
              stats={REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER}
              alignedRowCount={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER.length}
            />
          </div>
        </div>
      </ReportProjectTabSection>

      <ReportProjectTabSection>
        <ReportProjectKeyCategoriesCard categories={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER} />
      </ReportProjectTabSection>
    </div>
  );
}
