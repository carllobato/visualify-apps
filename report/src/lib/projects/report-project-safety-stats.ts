export type ReportProjectSafetyStat = {
  label: string;
  value: string;
  display?: "text" | "rag";
};

export function partitionReportProjectSafetyStats(stats: ReportProjectSafetyStat[]): {
  primary: ReportProjectSafetyStat[];
  secondary: ReportProjectSafetyStat[];
} {
  const primary: ReportProjectSafetyStat[] = [];
  const secondary: ReportProjectSafetyStat[] = [];

  for (const stat of stats) {
    if (/wps\d/i.test(stat.label)) {
      secondary.push(stat);
      continue;
    }
    primary.push(stat);
  }

  return { primary, secondary };
}

/** Placeholder until report Excel upload supplies safety stats. */
export const REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER: ReportProjectSafetyStat[] = [
  { label: "Safety status", value: "Green", display: "rag" },
  { label: "WPS1", value: "0" },
  { label: "WPS2", value: "1" },
  { label: "WPS3", value: "0" },
  { label: "LTIFR", value: "0.12" },
  { label: "GSDC inspections completed", value: "14" },
  { label: "HRA inspections overdue actions", value: "2" },
];
