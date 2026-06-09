"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent } from "@visualify/design-system";
import { ReportProjectPageLayout } from "@/components/project/ReportProjectPageLayout";
import { ReportProjectBudgetCard } from "@/components/project/report/ReportProjectBudgetCard";
import { ReportProjectCategoryStatusCard } from "@/components/project/report/ReportProjectCategoryStatusCard";
import { ReportProjectSafetyCard } from "@/components/project/report/ReportProjectSafetyCard";
import { ReportProjectScheduleCard } from "@/components/project/report/ReportProjectScheduleCard";
import { ReportProjectKeyMetricsCard } from "@/components/project/report/ReportProjectKeyMetricsCard";
import { ReportProjectModuleStatusCard } from "@/components/project/report/ReportProjectModuleStatusCard";
import { ReportProjectStageStepper } from "@/components/project/report/ReportProjectStageStepper";
import { ReportProjectTopRisksCard } from "@/components/project/report/ReportProjectTopRisksCard";
import {
  LazyReportProjectCostTabContent,
  LazyReportProjectScheduleTabPanel,
  LazyReportProjectSettingsForm,
  LazyReportProjectTabContent,
} from "@/components/project/report/report-lazy-tab-panels";
import { ReportProjectModuleTabs } from "@/components/project/report/ReportProjectModuleTabs";
import { ReportProjectUploadTabContent } from "@/components/project/report/ReportProjectUploadTabContent";
import {
  REPORT_MODULE_TABS,
  reportModuleTabShowsStageStepper,
  type ReportModuleTabId,
} from "@/components/project/report/report-module-tabs";
import {
  getReportOverviewModuleLinkId,
  getReportOverviewModuleTabId,
  getReportOverviewNavigateLabel,
  type ReportOverviewModuleLinkId,
} from "@/lib/projects/report-project-overview-link";
import {
  resolveReportProjectReportingPeriod,
  type ReportProjectReportingPeriod,
} from "@/lib/projects/report-project-reporting-date";
import { writeReportLastProjectIdForWorkspace } from "@/lib/projects/report-last-project-preference";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { ReportSnapshotUploadRow } from "@/lib/projects/report-snapshots-server";
import type { ResolvedReportProjectData } from "@/lib/report-upload/resolve-report-project-data";

function ReportModuleTabPlaceholder({ tabLabel }: { tabLabel: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1.5 py-8 text-center">
        <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
          {tabLabel}
        </p>
        <p className="m-0 max-w-md text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
          Coming soon. This view will be part of the project report module.
        </p>
      </CardContent>
    </Card>
  );
}

function ReportProjectNoReportEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <p className="m-0 text-[length:var(--ds-text-base)] font-medium text-[var(--ds-text-primary)]">
          Upload your first report to view
        </p>
      </CardContent>
    </Card>
  );
}

type ReportProjectReportPageContentProps = {
  project: ReportProjectListItem;
  workspaceId: string | null;
  periodParam?: string | null;
  reportingPeriods?: ReportProjectReportingPeriod[];
  recentUploads?: ReportSnapshotUploadRow[];
  resolvedData: ResolvedReportProjectData;
};

export function ReportProjectReportPageContent({
  project,
  workspaceId,
  periodParam = null,
  reportingPeriods = [],
  recentUploads = [],
  resolvedData,
}: ReportProjectReportPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<ReportModuleTabId>("page-1");
  const [hoveredOverviewModule, setHoveredOverviewModule] =
    useState<ReportOverviewModuleLinkId | null>(null);
  const [focusedOverviewModule, setFocusedOverviewModule] =
    useState<ReportOverviewModuleLinkId | null>(null);
  const hasReportData = reportingPeriods.length > 0;
  const selectedReportingPeriod = resolveReportProjectReportingPeriod(periodParam, reportingPeriods);
  const {
    keyMetrics: projectMetrics,
    moduleStatus,
    schedule,
    safetyOverview,
    categories,
    topRisks,
    budget,
    cost,
    milestones,
    safetyStats,
  } = resolvedData;

  useEffect(() => {
    if (reportingPeriods.length === 0) {
      return;
    }

    const normalizedPeriodParam = periodParam?.trim() ?? "";
    if (!normalizedPeriodParam) {
      return;
    }

    const resolvedPeriod = resolveReportProjectReportingPeriod(periodParam, reportingPeriods);
    if (resolvedPeriod == null) {
      return;
    }

    if (normalizedPeriodParam !== resolvedPeriod.isoDate) {
      router.replace(`${pathname}?period=${resolvedPeriod.isoDate}`, { scroll: false });
    }
  }, [pathname, periodParam, reportingPeriods, router]);

  useEffect(() => {
    if (workspaceId?.trim()) {
      writeReportLastProjectIdForWorkspace(workspaceId, project.id);
    }
  }, [workspaceId, project.id]);

  function handleReportingDateChange(isoDate: string) {
    router.replace(`${pathname}?period=${isoDate}`, { scroll: false });
  }

  function handleTabChange(tabId: ReportModuleTabId) {
    setActiveTab(tabId);
    setFocusedOverviewModule(null);
  }

  function handleOverviewModuleNavigate(linkId: ReportOverviewModuleLinkId) {
    const tabId = getReportOverviewModuleTabId(linkId);
    if (tabId != null) {
      setActiveTab(tabId);
      setFocusedOverviewModule(linkId);
    }
  }

  function handleModuleStatusNavigate(tabId: ReportModuleTabId, label: string) {
    setActiveTab(tabId);
    setFocusedOverviewModule(getReportOverviewModuleLinkId(label) ?? null);
  }

  function handleModuleStatusHover(label: string) {
    const linkId = getReportOverviewModuleLinkId(label);
    setHoveredOverviewModule(linkId ?? null);
  }

  function handleModuleStatusLeave() {
    setHoveredOverviewModule(null);
  }

  const activeTabLabel =
    REPORT_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  function renderActiveTabContent() {
    if (activeTab === "upload") {
      return (
        <ReportProjectUploadTabContent
          project={project}
          recentUploads={recentUploads}
          reportingPeriods={reportingPeriods}
          selectedReportingDate={selectedReportingPeriod?.isoDate ?? null}
        />
      );
    }

    if (!hasReportData) {
      return <ReportProjectNoReportEmptyState />;
    }

    if (activeTab === "page-2") {
      return (
        <LazyReportProjectCostTabContent
          cost={cost}
          focusedModule={focusedOverviewModule}
        />
      );
    }

    if (activeTab === "project") {
      return (
        <LazyReportProjectTabContent
          project={project}
          focusedModule={focusedOverviewModule}
          schedule={schedule}
          milestones={milestones}
          safetyStats={safetyStats}
          categories={categories}
          topRisks={topRisks}
        />
      );
    }

    if (activeTab === "schedule") {
      return (
        <LazyReportProjectScheduleTabPanel
          schedule={schedule}
          highlighted={focusedOverviewModule === "schedule"}
        />
      );
    }

    if (activeTab === "page-1") {
      return (
        <>
          <ReportProjectModuleStatusCard
            items={moduleStatus}
            projectStatus={projectMetrics}
            onItemNavigate={handleModuleStatusNavigate}
            onItemHover={handleModuleStatusHover}
            onItemLeave={handleModuleStatusLeave}
          />
          <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-col sm:w-1/3">
              <ReportProjectKeyMetricsCard
                metrics={projectMetrics}
                onNavigate={() => handleOverviewModuleNavigate("overall")}
                navigateLabel={getReportOverviewNavigateLabel("overall")}
              />
            </div>
            <div className="flex min-w-0 flex-col sm:w-2/3">
              <ReportProjectTopRisksCard
                risks={topRisks}
                highlighted={hoveredOverviewModule === "risk"}
                rowHoverable
                onNavigate={() => handleOverviewModuleNavigate("risk")}
                navigateLabel={getReportOverviewNavigateLabel("risk")}
              />
            </div>
          </div>
          <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectSafetyCard
                safety={safetyOverview}
                highlighted={hoveredOverviewModule === "safety"}
                rowHoverable
                onNavigate={() => handleOverviewModuleNavigate("safety")}
                navigateLabel={getReportOverviewNavigateLabel("safety")}
              />
            </div>
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectScheduleCard
                schedule={schedule}
                highlighted={hoveredOverviewModule === "schedule"}
                rowHoverable
                onNavigate={
                  getReportOverviewModuleTabId("schedule") != null
                    ? () => handleOverviewModuleNavigate("schedule")
                    : undefined
                }
                navigateLabel={
                  getReportOverviewModuleTabId("schedule") != null
                    ? getReportOverviewNavigateLabel("schedule")
                    : undefined
                }
              />
            </div>
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectBudgetCard
                budget={budget}
                highlighted={hoveredOverviewModule === "cost"}
                rowHoverable
                onNavigate={() => handleOverviewModuleNavigate("cost")}
                navigateLabel={getReportOverviewNavigateLabel("cost")}
              />
            </div>
          </div>
          <ReportProjectCategoryStatusCard
            categories={categories}
            rowHoverable
            onNavigate={() => handleTabChange("project")}
            navigateLabel="View Project category status — open Project tab"
          />
        </>
      );
    }

    return <ReportModuleTabPlaceholder tabLabel={activeTabLabel} />;
  }

  return (
    <ReportProjectPageLayout
      project={project}
      contentFullWidth
      reportingDate={selectedReportingPeriod?.isoDate ?? null}
      reportingPeriods={reportingPeriods}
      onReportingDateChange={handleReportingDateChange}
      headerTrailing={
        <ReportProjectModuleTabs activeTab={activeTab} onTabChange={handleTabChange} />
      }
    >
      <div className="min-w-0 w-full pt-4 max-md:overflow-x-visible max-md:pt-2">
        {activeTab === "settings" ? (
          <LazyReportProjectSettingsForm project={project} />
        ) : (
          <div className="report-project-overview-stack flex min-w-0 w-full flex-col gap-3">
            {hasReportData && reportModuleTabShowsStageStepper(activeTab) ? (
              <ReportProjectStageStepper stage={project.stage} />
            ) : null}
            {renderActiveTabContent()}
          </div>
        )}
      </div>
    </ReportProjectPageLayout>
  );
}
