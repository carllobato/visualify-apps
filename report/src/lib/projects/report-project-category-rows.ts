import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectCategoryRow = {
  id: string;
  category: string;
  status: string;
  summary: string;
  trend: ReportProjectTrend;
};

/** Placeholder until report Excel upload supplies category status rows. */
export const REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER: ReportProjectCategoryRow[] = [
  {
    id: "sc-1",
    category: "Land",
    status: "Green",
    summary:
      "Acquisition complete. Cladding claim remains under legal review with counsel engaged on settlement options, title indemnity in place for the south boundary, and no material constraints flagged for Phase 2 land release.",
    trend: { text: "Improved vs last report", sentiment: "favorable" },
  },
  {
    id: "sc-2",
    category: "Design",
    status: "Amber",
    summary: "Facade review outstanding. PTU design frozen.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "sc-3",
    category: "Authority",
    status: "Amber",
    summary: "South access road condition discharge pending.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "sc-4",
    category: "Power & Utilities",
    status: "Red",
    summary: "11kV energisation remains the critical path.",
    trend: { text: "Worsened vs last report", sentiment: "unfavorable" },
  },
  {
    id: "sc-5",
    category: "Construction",
    status: "Green",
    summary: "Hall A weathertight; PTU fit-out mobilised.",
    trend: { text: "Improved vs last report", sentiment: "favorable" },
  },
  {
    id: "sc-6",
    category: "Customer",
    status: "Amber",
    summary: "NRC draft under legal review.",
    trend: { text: "Worsened vs last report", sentiment: "unfavorable" },
  },
];
