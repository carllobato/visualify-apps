"use client";

import { useState } from "react";
import { Tab, Tabs } from "@visualify/design-system";
import { ReportModuleCashflowBody } from "@/components/project/report/ReportModuleCashflowBody";
import { ReportModuleFinancialBody } from "@/components/project/report/ReportModuleFinancialBody";
import { ReportModuleRisksIssuesBody } from "@/components/project/report/ReportModuleRisksIssuesBody";
import { ReportModuleSettingsBody } from "@/components/project/report/ReportModuleSettingsBody";
import { ReportModuleSnapshotsBody } from "@/components/project/report/ReportModuleSnapshotsBody";
import { ReportModuleStatusUpdatesBody } from "@/components/project/report/ReportModuleStatusUpdatesBody";
import { ReportModuleSummaryBody } from "@/components/project/report/ReportModuleSummaryBody";
import { ReportModuleUploadsBody } from "@/components/project/report/ReportModuleUploadsBody";
import {
  REPORT_MODULE_TABS,
  type ReportModuleTabId,
} from "@/components/project/report/report-module-tabs";

export function ProjectReportPageContent() {
  const [activeTab, setActiveTab] = useState<ReportModuleTabId>("overview");

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
        {activeTab === "overview" ? (
          <ReportModuleSummaryBody />
        ) : activeTab === "status-updates" ? (
          <ReportModuleStatusUpdatesBody />
        ) : activeTab === "risks-issues" ? (
          <ReportModuleRisksIssuesBody />
        ) : activeTab === "financial" ? (
          <ReportModuleFinancialBody />
        ) : activeTab === "cashflow" ? (
          <ReportModuleCashflowBody />
        ) : activeTab === "uploads" ? (
          <ReportModuleUploadsBody />
        ) : activeTab === "snapshots" ? (
          <ReportModuleSnapshotsBody />
        ) : (
          <ReportModuleSettingsBody />
        )}
      </div>
    </div>
  );
}
