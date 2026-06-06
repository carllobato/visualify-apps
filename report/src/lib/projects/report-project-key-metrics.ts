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
  deploymentCurrent: string;
  deploymentTotal: string;
  numberOfHalls: string;
  rfs: string;
  customerStatus: string;
};

/** Placeholder until report Excel upload supplies project metrics. */
export const REPORT_PROJECT_KEY_METRICS_PLACEHOLDER: ReportProjectKeyMetrics = {
  status: "Amber",
  statusTrend: { text: "Worsened vs last report", sentiment: "unfavorable" },
  statusContributors: ["Schedule", "Project Risks"],
  deploymentCurrent: "15MW",
  deploymentTotal: "105MW",
  numberOfHalls: "1",
  rfs: "24 Sept 2026",
  customerStatus: "Secured",
};

export function toReportProjectKeyMetricRows(
  metrics: ReportProjectKeyMetrics,
): ReportProjectKeyMetric[] {
  return [
    {
      label: "Deployment",
      value: `${metrics.deploymentCurrent} / ${metrics.deploymentTotal}`,
      callout: getReportProjectDeploymentCallout(metrics),
    },
    {
      label: "Nr of Halls",
      value: metrics.numberOfHalls,
      callout: getReportProjectNumberOfHallsCallout(metrics),
    },
    { label: "RFS", value: metrics.rfs },
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

export function getReportProjectNumberOfHallsCallout(
  metrics: Pick<ReportProjectKeyMetrics, "numberOfHalls">,
): { title: string; body: string } {
  return {
    title: "Data halls",
    body: `${metrics.numberOfHalls} Data Halls in the current deployment.`,
  };
}

export function getReportProjectDeploymentCallout(
  metrics: Pick<ReportProjectKeyMetrics, "deploymentCurrent" | "deploymentTotal">,
): { title: string; body: string } {
  return {
    title: "Deployment vs campus",
    body: `${metrics.deploymentCurrent} deployment size versus ${metrics.deploymentTotal} campus size.`,
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
