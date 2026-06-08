export type ReportProjectCategoryRow = {
  id: string;
  category: string;
  status: string;
  summary: string;
};

/** Placeholder until report Excel upload supplies category status rows. */
export const REPORT_PROJECT_CATEGORY_ROWS_PLACEHOLDER: ReportProjectCategoryRow[] = [
  {
    id: "sc-1",
    category: "Land",
    status: "Green",
    summary: "Acquisition complete. Cladding claim remains under legal review.",
  },
  {
    id: "sc-2",
    category: "Design",
    status: "Amber",
    summary: "Facade review outstanding. PTU design frozen.",
  },
  {
    id: "sc-3",
    category: "Authority",
    status: "Amber",
    summary: "South access road condition discharge pending.",
  },
  {
    id: "sc-4",
    category: "Power & Utilities",
    status: "Red",
    summary: "11kV energisation remains the critical path.",
  },
  {
    id: "sc-5",
    category: "Construction",
    status: "Green",
    summary: "Hall A weathertight; PTU fit-out mobilised.",
  },
  {
    id: "sc-6",
    category: "Customer",
    status: "Amber",
    summary: "NRC draft under legal review.",
  },
];
