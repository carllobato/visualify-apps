import type { ReportProjectBudget } from "@/lib/projects/report-project-budget";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";
import type { ReportProjectCostData } from "@/lib/projects/report-project-cost";
import type { ReportProjectKeyMetrics } from "@/lib/projects/report-project-key-metrics";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import type { ReportProjectModuleStatusItem } from "@/lib/projects/report-project-module-status";
import type { ReportProjectSafetyOverview } from "@/lib/projects/report-project-safety-overview";
import type { ReportProjectSafetyStat } from "@/lib/projects/report-project-safety-stats";
import type { ReportProjectScheduleOverview } from "@/lib/projects/report-project-schedule";
import type { ReportProjectTopRisk } from "@/lib/projects/report-project-top-risks";

/** Parsed report data stored in visualify_report_snapshots.payload. */
export type ReportSnapshotPayload = {
  reportingDate: string;
  isLatest: boolean;
  keyMetrics: ReportProjectKeyMetrics;
  moduleStatus: ReportProjectModuleStatusItem[];
  schedule: ReportProjectScheduleOverview;
  milestones: ReportProjectKeyMilestone[];
  safetyOverview: ReportProjectSafetyOverview;
  safetyStats: ReportProjectSafetyStat[];
  categories: ReportProjectCategoryRow[];
  topRisks: ReportProjectTopRisk[];
  budget: ReportProjectBudget;
  cost: ReportProjectCostData;
};
