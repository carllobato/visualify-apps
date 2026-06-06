"use client";

import { useState } from "react";
import { Card, CardContent, Tab, Tabs } from "@visualify/design-system";
import { ReportProjectBudgetCard } from "@/components/project/report/ReportProjectBudgetCard";
import { ReportProjectScheduleCard } from "@/components/project/report/ReportProjectScheduleCard";
import { ReportProjectKeyCategoriesCard } from "@/components/project/report/ReportProjectKeyCategoriesCard";
import { ReportProjectKeyMetricsCard } from "@/components/project/report/ReportProjectKeyMetricsCard";
import { ReportProjectModuleStatusCard } from "@/components/project/report/ReportProjectModuleStatusCard";
import { ReportProjectSafetyStatsCard } from "@/components/project/report/ReportProjectSafetyStatsCard";
import { ReportProjectSettingsForm } from "@/components/project/report/ReportProjectSettingsForm";
import { ReportProjectStageStepper } from "@/components/project/report/ReportProjectStageStepper";
import { REPORT_PROJECT_BUDGET_PLACEHOLDER } from "@/lib/projects/report-project-budget";
import { REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER } from "@/lib/projects/report-project-category-rows";
import { REPORT_PROJECT_KEY_METRICS_PLACEHOLDER } from "@/lib/projects/report-project-key-metrics";
import { REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER } from "@/lib/projects/report-project-module-status";
import { REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER } from "@/lib/projects/report-project-safety-stats";
import {
  REPORT_MODULE_TABS,
  type ReportModuleTabId,
} from "@/components/project/report/report-module-tabs";
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
};

export function ReportProjectReportPageContent({ project }: ReportProjectReportPageContentProps) {
  const [activeTab, setActiveTab] = useState<ReportModuleTabId>("page-1");

  const activeTabLabel =
    REPORT_MODULE_TABS.find((tab) => tab.id === activeTab)?.label ?? "Overview";

  return (
    <div className="flex min-w-0 w-full flex-col">
      <header className="shrink-0 border-b border-[var(--ds-border-subtle)] pb-2">
        <Tabs className="-mb-px w-full" aria-label="Report module views">
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
      </header>

      <div className="min-w-0 w-full pt-4">
        {activeTab === "settings" ? (
          <ReportProjectSettingsForm project={project} />
        ) : activeTab === "page-1" ? (
          <div className="flex min-w-0 w-full flex-col gap-3">
            <ReportProjectStageStepper stage={project.stage} />
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex min-w-0 flex-col">
                <ReportProjectKeyMetricsCard metrics={REPORT_PROJECT_KEY_METRICS_PLACEHOLDER} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <ReportProjectModuleStatusCard items={REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER} />
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
            <div className="flex min-w-0 w-full flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="flex min-w-0 flex-col lg:w-1/2">
                <ReportProjectBudgetCard budget={REPORT_PROJECT_BUDGET_PLACEHOLDER} />
              </div>
              <div className="flex min-w-0 flex-col lg:w-1/2">
                <ReportProjectScheduleCard />
              </div>
            </div>
          </div>
        ) : (
          <ReportModuleTabPlaceholder tabLabel={activeTabLabel} />
        )}
      </div>
    </div>
  );
}
