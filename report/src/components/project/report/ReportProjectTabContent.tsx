import type { ReactNode } from "react";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMilestonesCard } from "@/components/project/report/ReportProjectKeyMilestonesCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { ReportProjectScheduleCard } from "@/components/project/report/ReportProjectScheduleCard";
import { ReportProjectTopRisksCard } from "@/components/project/report/ReportProjectTopRisksCard";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import type { ReportProjectSafetyStat } from "@/lib/projects/report-project-safety-stats";
import type { ReportProjectScheduleOverview } from "@/lib/projects/report-project-schedule";
import type { ReportProjectTopRisk } from "@/lib/projects/report-project-top-risks";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { ReportOverviewModuleLinkId } from "@/lib/projects/report-project-overview-link";

type ReportProjectTabContentProps = {
  project: ReportProjectListItem;
  focusedModule?: ReportOverviewModuleLinkId | null;
  schedule: ReportProjectScheduleOverview;
  milestones: ReportProjectKeyMilestone[];
  safetyStats: ReportProjectSafetyStat[];
  categories: ReportProjectCategoryRow[];
  topRisks: ReportProjectTopRisk[];
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
  schedule,
  milestones,
  safetyStats,
  categories,
  topRisks,
}: ReportProjectTabContentProps) {
  return (
    <ReportProjectTabSection>
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
        <div className="flex min-w-0 flex-col">
          <ReportProjectScheduleCard schedule={schedule} hoverable rowHoverable />
        </div>
        <div className="flex min-w-0 flex-col">
          <ReportProjectKeyMilestonesCard milestones={milestones} />
        </div>
      </div>
      <div className="grid min-w-0 w-full grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch">
        <div className="flex min-w-0 flex-col sm:col-span-1">
          <ReportProjectSafetyStatsCard
            stats={safetyStats}
            alignedRowCount={milestones.length}
            highlighted={focusedModule === "safety"}
          />
        </div>
        <div className="flex min-w-0 flex-col sm:col-span-2">
          <ReportProjectKeyCategoriesCard categories={categories} />
        </div>
      </div>
      <ReportProjectTopRisksCard
        risks={topRisks}
        expanded
        prominent
        highlighted={focusedModule === "risk"}
      />
    </ReportProjectTabSection>
  );
}
