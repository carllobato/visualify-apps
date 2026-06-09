import type { ReactNode } from "react";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMilestonesCard } from "@/components/project/report/ReportProjectKeyMilestonesCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { ReportProjectScheduleCard } from "@/components/project/report/ReportProjectScheduleCard";
import { ReportProjectTopRisksCard } from "@/components/project/report/ReportProjectTopRisksCard";
import { REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER } from "@/lib/projects/report-project-key-milestones";
import { REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER } from "@/lib/projects/report-project-safety-stats";
import { REPORT_PROJECT_TOP_RISKS_PLACEHOLDER } from "@/lib/projects/report-project-top-risks";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { ReportOverviewModuleLinkId } from "@/lib/projects/report-project-overview-link";

type ReportProjectTabContentProps = {
  project: ReportProjectListItem;
  focusedModule?: ReportOverviewModuleLinkId | null;
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

export function ReportProjectTabContent({
  project: _project,
  focusedModule = null,
}: ReportProjectTabContentProps) {
  return (
    <ReportProjectTabSection>
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
        <div className="flex min-w-0 flex-col">
          <ReportProjectScheduleCard hoverable rowHoverable />
        </div>
        <div className="flex min-w-0 flex-col">
          <ReportProjectKeyMilestonesCard milestones={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER} />
        </div>
      </div>
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch">
        <div className="flex min-w-0 flex-col sm:col-span-1">
          <ReportProjectSafetyStatsCard
            stats={REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER}
            alignedRowCount={REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER.length}
            highlighted={focusedModule === "safety"}
          />
        </div>
        <div className="flex min-w-0 flex-col sm:col-span-2">
          <ReportProjectKeyCategoriesCard categories={REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER} />
        </div>
      </div>
      <ReportProjectTopRisksCard
        risks={REPORT_PROJECT_TOP_RISKS_PLACEHOLDER}
        expanded
        prominent
        highlighted={focusedModule === "risk"}
      />
    </ReportProjectTabSection>
  );
}
