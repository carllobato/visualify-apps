export type ReportProjectSafetyStat = {
  label: string;
  value: string;
  display?: "text" | "rag";
};

/** Placeholder until report Excel upload supplies safety stats. */
export const REPORT_PROJECT_SAFETY_STATS_PLACEHOLDER: ReportProjectSafetyStat[] = [
  { label: "Safety status", value: "Green", display: "rag" },
  { label: "Incidents — WPS1", value: "0" },
  { label: "Incidents — WPS2", value: "1" },
  { label: "Incidents — WPS3", value: "0" },
  { label: "LTIFR", value: "0.12" },
  { label: "GSDC inspections completed", value: "14" },
  { label: "HRA inspections overdue actions", value: "2" },
];
