"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, Tab, Tabs } from "@visualify/design-system";
import { ReportProjectPageLayout } from "@/components/project/ReportProjectPageLayout";
import { ReportProjectBudgetCard } from "@/components/project/report/ReportProjectBudgetCard";
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
import { REPORT_PROJECT_BUDGET_PLACEHOLDER } from "@/lib/projects/report-project-budget";
import { REPORT_PROJECT_COST_PLACEHOLDER } from "@/lib/projects/report-project-cost";
import { REPORT_PROJECT_KEY_METRICS_PLACEHOLDER } from "@/lib/projects/report-project-key-metrics";
import { REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER } from "@/lib/projects/report-project-module-status";
import { REPORT_PROJECT_TOP_RISKS_PLACEHOLDER } from "@/lib/projects/report-project-top-risks";
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
  REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER,
  resolveReportProjectReportingPeriod,
} from "@/lib/projects/report-project-reporting-date";
import { writeReportLastProjectIdForWorkspace } from "@/lib/projects/report-last-project-preference";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

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

type ReportProjectReportPageContentProps = {
  project: ReportProjectListItem;
  workspaceId: string | null;
  periodParam?: string | null;
};

export function ReportProjectReportPageContent({
  project,
  workspaceId,
  periodParam = null,
}: ReportProjectReportPageContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<ReportModuleTabId>("page-1");
  const [hoveredOverviewModule, setHoveredOverviewModule] =
    useState<ReportOverviewModuleLinkId | null>(null);
  const reportingPeriods = REPORT_PROJECT_REPORTING_PERIODS_PLACEHOLDER;
  const selectedReportingPeriod = resolveReportProjectReportingPeriod(periodParam, reportingPeriods);

  useEffect(() => {
    const normalizedPeriodParam = periodParam?.trim() ?? "";
    if (!normalizedPeriodParam) {
      return;
    }

    const resolvedPeriod = resolveReportProjectReportingPeriod(periodParam, reportingPeriods);

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

  function handleOverviewModuleNavigate(linkId: ReportOverviewModuleLinkId) {
    const tabId = getReportOverviewModuleTabId(linkId);
    if (tabId != null) {
      setActiveTab(tabId);
    }
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
    if (activeTab === "page-2") {
      return <LazyReportProjectCostTabContent cost={REPORT_PROJECT_COST_PLACEHOLDER} />;
    }

    if (activeTab === "project") {
      return <LazyReportProjectTabContent project={project} />;
    }

    if (activeTab === "schedule") {
      return <LazyReportProjectScheduleTabPanel />;
    }

    if (activeTab === "page-1") {
      const moduleStatus = REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER;
      const projectMetrics = REPORT_PROJECT_KEY_METRICS_PLACEHOLDER;

      return (
        <>
          <ReportProjectModuleStatusCard
            items={moduleStatus}
            projectStatus={projectMetrics}
            onItemNavigate={setActiveTab}
            onItemHover={handleModuleStatusHover}
            onItemLeave={handleModuleStatusLeave}
          />
          <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex min-w-0 flex-col lg:w-1/2">
              <ReportProjectKeyMetricsCard
                metrics={projectMetrics}
                highlighted={hoveredOverviewModule === "overall"}
                onNavigate={() => handleOverviewModuleNavigate("overall")}
                navigateLabel={getReportOverviewNavigateLabel("overall")}
              />
            </div>
            <div className="flex min-w-0 flex-col lg:w-1/2">
              <ReportProjectTopRisksCard
                risks={REPORT_PROJECT_TOP_RISKS_PLACEHOLDER}
                highlighted={hoveredOverviewModule === "risk"}
                onNavigate={() => handleOverviewModuleNavigate("risk")}
                navigateLabel={getReportOverviewNavigateLabel("risk")}
              />
            </div>
          </div>
          <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectSafetyCard
                highlighted={hoveredOverviewModule === "safety"}
                onNavigate={() => handleOverviewModuleNavigate("safety")}
                navigateLabel={getReportOverviewNavigateLabel("safety")}
              />
            </div>
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectScheduleCard
                highlighted={hoveredOverviewModule === "schedule"}
                onNavigate={() => handleOverviewModuleNavigate("schedule")}
                navigateLabel={getReportOverviewNavigateLabel("schedule")}
              />
            </div>
            <div className="flex min-w-0 flex-col lg:w-1/3">
              <ReportProjectBudgetCard
                budget={REPORT_PROJECT_BUDGET_PLACEHOLDER}
                highlighted={hoveredOverviewModule === "cost"}
                onNavigate={() => handleOverviewModuleNavigate("cost")}
                navigateLabel={getReportOverviewNavigateLabel("cost")}
              />
            </div>
          </div>
        </>
      );
    }

    return <ReportModuleTabPlaceholder tabLabel={activeTabLabel} />;
  }

  return (
    <ReportProjectPageLayout
      project={project}
      contentFullWidth
      reportingDate={selectedReportingPeriod.isoDate}
      reportingPeriods={reportingPeriods}
      onReportingDateChange={handleReportingDateChange}
      headerTrailing={
        <Tabs
          className="h-10 !items-center max-md:w-max max-md:flex-nowrap"
          aria-label="Report module views"
        >
          {REPORT_MODULE_TABS.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Tab>
          ))}
        </Tabs>
      }
    >
      <div className="min-w-0 w-full pt-4 max-md:overflow-x-hidden max-md:pt-2">
        {activeTab === "settings" ? (
          <LazyReportProjectSettingsForm project={project} />
        ) : (
          <div className="flex min-w-0 w-full flex-col gap-3">
            {reportModuleTabShowsStageStepper(activeTab) ? (
              <ReportProjectStageStepper stage={project.stage} />
            ) : null}
            {renderActiveTabContent()}
          </div>
        )}
      </div>
    </ReportProjectPageLayout>
  );
}
