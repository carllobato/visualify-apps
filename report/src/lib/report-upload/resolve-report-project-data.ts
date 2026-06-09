import {
  formatReportScheduleDate,
  type ReportProjectScheduleOverview,
} from "@/lib/projects/report-project-schedule";
import type { ReportProjectBudget } from "@/lib/projects/report-project-budget";
import type { ReportProjectCategoryRow } from "@/lib/projects/report-project-category-rows";
import type { ReportProjectCostData, ReportProjectCostSummary } from "@/lib/projects/report-project-cost";
import {
  REPORT_PROJECT_NO_SNAPSHOT_STATUS,
  type ReportProjectKeyMetrics,
} from "@/lib/projects/report-project-key-metrics";
import type { ReportProjectKeyMilestone } from "@/lib/projects/report-project-key-milestones";
import type { ReportProjectModuleStatusItem } from "@/lib/projects/report-project-module-status";
import type { ReportProjectSafetyOverview } from "@/lib/projects/report-project-safety-overview";
import type { ReportProjectSafetyStat } from "@/lib/projects/report-project-safety-stats";
import type { ReportProjectTopRisk } from "@/lib/projects/report-project-top-risks";
import { REPORT_EXCEL_DEFAULT_TREND } from "@/lib/report-upload/report-excel-template";
import type { ReportSnapshotPayload } from "@/lib/report-upload/report-snapshot-payload";
import type { ReportProjectCostSummaryData } from "@/lib/projects/report-project-cost-summary";

export type ResolvedReportProjectData = {
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

const EMPTY_COST_SUMMARY_DATA: ReportProjectCostSummaryData = {
  wbsOptions: [],
  directRows: [],
};

function defaultTrend() {
  return { ...REPORT_EXCEL_DEFAULT_TREND };
}

function emptySchedule(): ReportProjectScheduleOverview {
  return {
    baselineRfs: "",
    forecastRfs: "",
    lastReportForecastRfs: "",
    trend: defaultTrend(),
  };
}

function emptyKeyMetrics(): ReportProjectKeyMetrics {
  return {
    status: REPORT_PROJECT_NO_SNAPSHOT_STATUS,
    statusTrend: { text: "", sentiment: "neutral" },
    statusContributors: [],
    siteItLoad: "",
    deploymentCurrent: "",
    deploymentTotal: "",
    rfs: "",
    customerStatus: "",
  };
}

function emptySafetyOverview(): ReportProjectSafetyOverview {
  return {
    targetLtifr: 0,
    currentLtifr: 0,
    lastReportLtifr: 0,
    trend: defaultTrend(),
  };
}

function emptyBudget(): ReportProjectBudget {
  return {
    approvedBudget: 0,
    currentForecast: 0,
    lastReportForecast: 0,
    currencySymbol: "$",
    trend: defaultTrend(),
  };
}

function emptyCostSummary(): ReportProjectCostSummary {
  return {
    currentBudget: 0,
    normalisedBudget: 0,
    forecastFinalAccount: 0,
    spentToDate: 0,
    deploymentSizeMw: 0,
    currencySymbol: "$",
    trend: defaultTrend(),
  };
}

function resolveSchedule(
  value: ReportProjectScheduleOverview | undefined,
): ReportProjectScheduleOverview {
  if (!value) return emptySchedule();

  return {
    baselineRfs: value.baselineRfs ?? "",
    forecastRfs: value.forecastRfs ?? "",
    lastReportForecastRfs: value.lastReportForecastRfs ?? value.forecastRfs ?? "",
    status: value.status,
    trend: value.trend ?? defaultTrend(),
  };
}

function resolveKeyMetrics(value: ReportProjectKeyMetrics | undefined): ReportProjectKeyMetrics {
  if (!value) return emptyKeyMetrics();

  return {
    status: value.status ?? "Green",
    statusTrend: value.statusTrend ?? defaultTrend(),
    statusContributors: value.statusContributors ?? [],
    siteItLoad: value.siteItLoad ?? "",
    deploymentCurrent: value.deploymentCurrent ?? "",
    deploymentTotal: value.deploymentTotal ?? value.deploymentCurrent ?? "",
    rfs: value.rfs ?? "",
    customerStatus: value.customerStatus ?? "",
  };
}

function resolveSafetyOverview(
  value: ReportProjectSafetyOverview | undefined,
): ReportProjectSafetyOverview {
  if (!value) return emptySafetyOverview();

  return {
    targetLtifr: value.targetLtifr ?? 0,
    currentLtifr: value.currentLtifr ?? 0,
    lastReportLtifr: value.lastReportLtifr ?? value.currentLtifr ?? 0,
    status: value.status,
    trend: value.trend ?? defaultTrend(),
  };
}

function resolveBudget(value: ReportProjectBudget | undefined): ReportProjectBudget {
  if (!value) return emptyBudget();

  return {
    approvedBudget: value.approvedBudget ?? 0,
    currentForecast: value.currentForecast ?? 0,
    lastReportForecast: value.lastReportForecast ?? value.currentForecast ?? 0,
    currencySymbol: value.currencySymbol ?? "$",
    status: value.status,
    trend: value.trend ?? defaultTrend(),
  };
}

function resolveCostSummary(value: ReportProjectCostSummary | undefined): ReportProjectCostSummary {
  if (!value) return emptyCostSummary();

  return {
    currentBudget: value.currentBudget ?? 0,
    normalisedBudget: value.normalisedBudget ?? 0,
    forecastFinalAccount: value.forecastFinalAccount ?? 0,
    spentToDate: value.spentToDate ?? 0,
    deploymentSizeMw: value.deploymentSizeMw ?? 0,
    currencySymbol: value.currencySymbol ?? "$",
    status: value.status,
    trend: value.trend ?? defaultTrend(),
    lastReport: value.lastReport,
  };
}

function resolveCostSummaryData(
  value: ReportProjectCostSummaryData | undefined,
): ReportProjectCostSummaryData {
  if (!value) return EMPTY_COST_SUMMARY_DATA;

  return {
    wbsOptions: value.wbsOptions ?? [],
    directRows: value.directRows ?? [],
  };
}

/** Project overview RFS Date uses the same value as Schedule Target RFS. */
function resolveKeyMetricsRfs(
  keyMetrics: ReportProjectKeyMetrics,
  schedule: ReportProjectScheduleOverview,
): ReportProjectKeyMetrics {
  if (!schedule.baselineRfs.trim()) {
    return keyMetrics;
  }

  return {
    ...keyMetrics,
    rfs: formatReportScheduleDate(schedule.baselineRfs),
  };
}

export function resolveReportProjectData(
  payload: ReportSnapshotPayload | null | undefined,
): ResolvedReportProjectData {
  if (!payload) {
    const schedule = emptySchedule();
    return {
      keyMetrics: resolveKeyMetricsRfs(emptyKeyMetrics(), schedule),
      moduleStatus: [],
      schedule,
      milestones: [],
      safetyOverview: emptySafetyOverview(),
      safetyStats: [],
      categories: [],
      topRisks: [],
      budget: emptyBudget(),
      cost: {
        summary: emptyCostSummary(),
        costSummary: EMPTY_COST_SUMMARY_DATA,
        cashflow: [],
      },
    };
  }

  const schedule = resolveSchedule(payload.schedule);
  const keyMetrics = resolveKeyMetricsRfs(resolveKeyMetrics(payload.keyMetrics), schedule);

  return {
    keyMetrics,
    moduleStatus: payload.moduleStatus ?? [],
    schedule,
    milestones: payload.milestones ?? [],
    safetyOverview: resolveSafetyOverview(payload.safetyOverview),
    safetyStats: payload.safetyStats ?? [],
    categories: payload.categories ?? [],
    topRisks: payload.topRisks ?? [],
    budget: resolveBudget(payload.budget),
    cost: {
      summary: resolveCostSummary(payload.cost?.summary),
      costSummary: resolveCostSummaryData(payload.cost?.costSummary),
      cashflow: payload.cost?.cashflow ?? [],
    },
  };
}
