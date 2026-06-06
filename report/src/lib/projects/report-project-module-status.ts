import type { ReportModuleTabId } from "@/components/project/report/report-module-tabs";
import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectModuleStatusItem = {
  label: string;
  status: string;
  trend: ReportProjectTrend;
};

const REPORT_MODULE_STATUS_TAB_BY_LABEL: Record<string, ReportModuleTabId> = {
  Schedule: "schedule",
  Cost: "page-2",
  Safety: "project",
  Risk: "project",
};

export function getReportModuleStatusTabId(label: string): ReportModuleTabId | undefined {
  return REPORT_MODULE_STATUS_TAB_BY_LABEL[label];
}

export function getReportModuleStatusValue(
  label: string,
  items: ReportProjectModuleStatusItem[] = REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER,
): string {
  return items.find((item) => item.label === label)?.status ?? "Green";
}

/** Placeholder until report Excel upload supplies module status. */
export const REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER: ReportProjectModuleStatusItem[] = [
  {
    label: "Safety",
    status: "Green",
    trend: { text: "Improved vs last report", sentiment: "favorable" },
  },
  {
    label: "Schedule",
    status: "Red",
    trend: { text: "2 weeks behind vs last report", sentiment: "unfavorable" },
  },
  {
    label: "Cost",
    status: "Green",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    label: "Risk",
    status: "Amber",
    trend: { text: "1 additional risk vs last report", sentiment: "unfavorable" },
  },
];

const REPORT_RAG_STATUS_PRIORITY: Record<string, number> = {
  red: 3,
  amber: 2,
  yellow: 2,
  green: 1,
};

export function getReportProjectOverallRagStatus(
  items: ReportProjectModuleStatusItem[],
): string {
  let overallStatus = "Green";

  for (const item of items) {
    const priority = REPORT_RAG_STATUS_PRIORITY[item.status.toLowerCase()] ?? 0;
    const overallPriority = REPORT_RAG_STATUS_PRIORITY[overallStatus.toLowerCase()] ?? 0;

    if (priority > overallPriority) {
      overallStatus = item.status;
    }
  }

  return overallStatus;
}
