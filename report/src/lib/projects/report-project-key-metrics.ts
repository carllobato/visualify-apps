import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectKeyMetric = {
  label: string;
  value: string;
  callout?: {
    title: string;
    body: string;
  };
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
    {
      label: "Site IT Load",
      value: metrics.siteItLoad,
      callout: getReportProjectSiteItLoadCallout(metrics),
    },
    {
      label: "Deployment IT Load",
      value: metrics.deploymentCurrent,
      callout: getReportProjectDeploymentCallout(metrics),
    },
    { label: "RFS Date", value: metrics.rfs },
    { label: "Customer Status", value: metrics.customerStatus },
  ];
}

function formatReportProjectStatusPhrase(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "green") return "On Track";
  if (normalized === "amber" || normalized === "yellow") return "At Risk";
  if (normalized === "red") return "Off Track";
  return status;
}

function formatReportProjectStatusContributorList(contributors: string[]): string {
  if (contributors.length === 0) return "";
  if (contributors.length === 1) return contributors[0];
  if (contributors.length === 2) return `${contributors[0]} and ${contributors[1]}`;
  return `${contributors.slice(0, -1).join(", ")}, and ${contributors.at(-1)}`;
}

export function getReportProjectSiteItLoadCallout(
  metrics: Pick<ReportProjectKeyMetrics, "siteItLoad" | "deploymentTotal">,
): { title: string; body: string } {
  return {
    title: "Site IT load",
    body: `${metrics.siteItLoad} total campus capacity; ${metrics.deploymentTotal} masterplan envelope.`,
  };
}

export function getReportProjectDeploymentCallout(
  metrics: Pick<ReportProjectKeyMetrics, "deploymentCurrent" | "deploymentTotal">,
): { title: string; body: string } {
  return {
    title: "Deployment IT load",
    body: `${metrics.deploymentCurrent} live deployment against ${metrics.deploymentTotal} campus capacity.`,
  };
}

export function getReportProjectStatusRatingCallout(metrics: Pick<
  ReportProjectKeyMetrics,
  "status" | "statusContributors"
>): { title: string; body: string } | null {
  if (metrics.statusContributors.length === 0) return null;

  const phrase = formatReportProjectStatusPhrase(metrics.status);
  const contributors = formatReportProjectStatusContributorList(metrics.statusContributors);

  return {
    title: `Why ${phrase}?`,
    body: `Rating driven by ${contributors}.`,
  };
}
