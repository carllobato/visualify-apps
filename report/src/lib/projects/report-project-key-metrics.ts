export type ReportProjectKeyMetric = {
  label: string;
  value: string;
};

export type ReportProjectKeyMetrics = {
  siteItLoad: string;
  deployment: string;
  numberOfHalls: string;
  rfs: string;
  customerStatus: string;
};

/** Placeholder until report Excel upload supplies project metrics. */
export const REPORT_PROJECT_KEY_METRICS_PLACEHOLDER: ReportProjectKeyMetrics = {
  siteItLoad: "15MW",
  deployment: "15MW",
  numberOfHalls: "1",
  rfs: "24 Sept 2026",
  customerStatus: "Secured",
};

export function toReportProjectKeyMetricRows(
  metrics: ReportProjectKeyMetrics,
): ReportProjectKeyMetric[] {
  return [
    { label: "Site IT Load", value: metrics.siteItLoad },
    { label: "Deployment", value: metrics.deployment },
    { label: "Nr of Halls", value: metrics.numberOfHalls },
    { label: "RFS", value: metrics.rfs },
    { label: "Customer Status", value: metrics.customerStatus },
  ];
}
