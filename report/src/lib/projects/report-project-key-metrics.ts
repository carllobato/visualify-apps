import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectKeyMetric = {
  label: string;
  value: string;
};

export type ReportProjectKeyMetrics = {
  status: string;
  statusTrend: ReportProjectTrend;
  /** Module labels that explain the overall status rating. */
  statusContributors: string[];
  siteItLoad: string;
  deploymentCurrent: string;
  deploymentTotal: string;
  rfs: string;
  customerStatus: string;
};

/** Placeholder until report Excel upload supplies project metrics. */
export const REPORT_PROJECT_KEY_METRICS_PLACEHOLDER: ReportProjectKeyMetrics = {
  status: "Amber",
  statusTrend: { text: "Worsened vs last report", sentiment: "unfavorable" },
  statusContributors: ["Schedule", "Project Risks"],
  siteItLoad: "105MW",
  deploymentCurrent: "15MW",
  deploymentTotal: "105MW",
  rfs: "24 Sept 2026",
  customerStatus: "Secured",
};

/**
 * Latest overall RAG for a project list row.
 * Placeholder until report upload supplies per-project metrics.
 */
export function resolveReportProjectLatestOverallStatus(_projectId: string): string {
  return REPORT_PROJECT_KEY_METRICS_PLACEHOLDER.status;
}

export function toReportProjectKeyMetricRows(
  metrics: ReportProjectKeyMetrics,
): ReportProjectKeyMetric[] {
  return [
    { label: "Site IT Load", value: metrics.siteItLoad },
    { label: "Deployment IT Load", value: metrics.deploymentCurrent },
    { label: "RFS Date", value: metrics.rfs },
    { label: "Customer Status", value: metrics.customerStatus },
  ];
}
