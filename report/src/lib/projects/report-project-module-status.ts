export type ReportProjectModuleStatusItem = {
  label: string;
  status: string;
  comment: string;
};

/** Placeholder until report Excel upload supplies module status. */
export const REPORT_PROJECT_MODULE_STATUS_PLACEHOLDER: ReportProjectModuleStatusItem[] = [
  {
    label: "Safety",
    status: "Green",
    comment: "WPS2 incident closed out; no open LTIs.",
  },
  {
    label: "Cost",
    status: "Amber",
    comment: "Forecast +3.0% to approved budget.",
  },
  {
    label: "Time",
    status: "Amber",
    comment: "Hall A delivery tracking +2 weeks vs baseline.",
  },
  {
    label: "Risk",
    status: "Amber",
    comment: "Two high-priority risks without mitigation owners.",
  },
];
