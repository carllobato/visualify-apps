export type ReportProjectKeyMilestone = {
  id: string;
  milestone: string;
  forecastDate: string;
};

/** Placeholder until report Excel upload supplies upcoming milestones. */
export const REPORT_PROJECT_KEY_MILESTONES_PLACEHOLDER: ReportProjectKeyMilestone[] = [
  {
    id: "milestone-1",
    milestone: "Utility Energisation",
    forecastDate: "18 Jul 2026",
  },
  {
    id: "milestone-2",
    milestone: "NRC Execution",
    forecastDate: "12 Aug 2026",
  },
  {
    id: "milestone-3",
    milestone: "Construction Completion",
    forecastDate: "14 Mar 2027",
  },
  {
    id: "milestone-4",
    milestone: "IST Commencement",
    forecastDate: "9 Jun 2027",
  },
  {
    id: "milestone-5",
    milestone: "Ready For Service",
    forecastDate: "24 Sept 2026",
  },
];
