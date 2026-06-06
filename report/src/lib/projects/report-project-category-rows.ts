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
    summary: "Site Aquisition completed, on-going claim regarding Cladding.",
  },
  {
    id: "sc-2",
    category: "Design",
    status: "Amber",
    summary: "Façade detailing under review; PTU design frozen for procurement.",
  },
  {
    id: "sc-3",
    category: "Authority",
    status: "Amber",
    summary: "Planning condition discharge pending for south access road.",
  },
  {
    id: "sc-4",
    category: "Power & Utilities",
    status: "Amber",
    summary: "11kV connection offer accepted; energisation window targeted Jul 2026.",
  },
  {
    id: "sc-5",
    category: "Procurement",
    status: "Amber",
    summary: "Chiller on order; switchgear slot confirmation with supplier due 10 Jun.",
  },
  {
    id: "sc-6",
    category: "Construction",
    status: "Green",
    summary: "Hall A shell weathertight; PTU fit-out mobilised on programme.",
  },
  {
    id: "sc-7",
    category: "Commercial",
    status: "Amber",
    summary: "Forecast +3.0% to budget; contingency draw proposed at Gateway 6.",
  },
  {
    id: "sc-8",
    category: "Customer",
    status: "Amber",
    summary: "NRC draft under legal review; customer workshop scheduled.",
  },
  {
    id: "sc-9",
    category: "Safety",
    status: "Green",
    summary: "WPS2 incident closed out; two HRA actions tracking to 10 Jun.",
  },
];
