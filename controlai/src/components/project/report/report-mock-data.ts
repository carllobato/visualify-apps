/** GreenSquare weekly report mock — aligned to Excel "New Cover 1" and "New Cover 2". */

export const REPORT_SUMMARY_FALLBACK_PROJECT_LABEL = "GS-DUB-01 · Hall A";

export type ReportHistoricalPeriod = {
  id: string;
  label: string;
  reportDate: string;
};

export const REPORT_HISTORICAL_PERIODS: ReportHistoricalPeriod[] = [
  { id: "2026-06", label: "June 2026", reportDate: "02 Jun 2026" },
  { id: "2026-05", label: "May 2026", reportDate: "30 May 2026" },
  { id: "2026-04", label: "April 2026", reportDate: "28 Apr 2026" },
  { id: "2026-03", label: "March 2026", reportDate: "31 Mar 2026" },
  { id: "2026-02", label: "February 2026", reportDate: "27 Feb 2026" },
  { id: "2026-01", label: "January 2026", reportDate: "31 Jan 2026" },
];

export const REPORT_COVER_HEADER = {
  site: "GreenSquare Dublin",
  reportDate: REPORT_HISTORICAL_PERIODS[0].reportDate,
} as const;

export type ReportSummaryCategoryRow = {
  id: string;
  category: string;
  status: string;
  summary: string;
};

export const REPORT_SUMMARY_CATEGORY_ROWS: ReportSummaryCategoryRow[] = [
  {
    id: "sc-1",
    category: "Land",
    status: "Green",
    summary: "Site acquisition complete; access agreements in place for civils.",
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

export const REPORT_KEY_PROJECT_METRICS = [
  { label: "Site IT MW", value: "120 MW" },
  { label: "Site # Data Halls", value: "4" },
  { label: "This Project IT MW", value: "30 MW" },
  { label: "Revenue Ready Date", value: "Q1 2027" },
] as const;

export const REPORT_SAFETY_METRICS = [
  { label: "Safety status", value: "Green", badgeStatus: "success" as const },
  { label: "Incidents — WPS1", value: "0" },
  { label: "Incidents — WPS2", value: "1" },
  { label: "Incidents — WPS3", value: "0" },
  { label: "LTIFR", value: "0.12" },
  { label: "GSDC inspections completed", value: "14" },
  { label: "HRA inspections overdue actions", value: "2" },
] as const;

export type ReportStatusUpdateRow = {
  id: string;
  category: string;
  status: string;
  counterparty: string;
  gsdcLead: string;
  lastUpdate: string;
  currentUpdate: string;
  nextMilestone: string;
};

export const REPORT_STATUS_UPDATES: ReportStatusUpdateRow[] = [
  {
    id: "su-1",
    category: "Safety",
    status: "Green",
    counterparty: "Main contractor",
    gsdcLead: "HSE lead",
    lastUpdate: "30 May 2026",
    currentUpdate: "WPS2 incident closed out; HRA actions tracking to plan.",
    nextMilestone: "Monthly GSDC inspection — 14 Jun 2026",
  },
  {
    id: "su-2",
    category: "Customer NRC",
    status: "Amber",
    counterparty: "Hyperscale customer",
    gsdcLead: "Commercial lead",
    lastUpdate: "29 May 2026",
    currentUpdate: "NRC draft under legal review; customer workshop scheduled.",
    nextMilestone: "Executed NRC — target 20 Jun 2026",
  },
  {
    id: "su-3",
    category: "11kV Power to Site",
    status: "Amber",
    counterparty: "ESB Networks",
    gsdcLead: "Utilities manager",
    lastUpdate: "28 May 2026",
    currentUpdate: "Connection offer accepted; civil route survey complete.",
    nextMilestone: "Energisation window confirmed — Jul 2026",
  },
  {
    id: "su-4",
    category: "Construction",
    status: "Green",
    counterparty: "Main contractor",
    gsdcLead: "Construction manager",
    lastUpdate: "02 Jun 2026",
    currentUpdate: "Hall A shell weathertight; PTU fit-out mobilised.",
    nextMilestone: "PTU 1 ready for customer — Sep 2026",
  },
  {
    id: "su-5",
    category: "PTUs",
    status: "Green",
    counterparty: "MEP subcontractor",
    gsdcLead: "MEP lead",
    lastUpdate: "01 Jun 2026",
    currentUpdate: "PTU 1 mechanical plant set; commissioning plan issued.",
    nextMilestone: "PTU 1 IST start — Aug 2026",
  },
];

export type ReportRiskIssueRow = {
  id: string;
  riskOrIssue: string;
  likelihood: string;
  impact: string;
  mitigationOrComment: string;
};

export const REPORT_RISKS_ISSUES_TOP5: ReportRiskIssueRow[] = [
  {
    id: "ri-1",
    riskOrIssue: "11kV energisation delay",
    likelihood: "Medium",
    impact: "High",
    mitigationOrComment: "Weekly ESB coordination; contingency programme path modelled.",
  },
  {
    id: "ri-2",
    riskOrIssue: "Customer NRC execution slip",
    likelihood: "Medium",
    impact: "Medium",
    mitigationOrComment: "Legal fast-track review; executive escalation with customer.",
  },
  {
    id: "ri-3",
    riskOrIssue: "Chiller lead time",
    likelihood: "Low",
    impact: "High",
    mitigationOrComment: "Early order placed; alternate supplier qualified.",
  },
  {
    id: "ri-4",
    riskOrIssue: "PTU commissioning resource",
    likelihood: "Medium",
    impact: "Medium",
    mitigationOrComment: "Commissioning agent appointed; float on Hall A programme.",
  },
  {
    id: "ri-5",
    riskOrIssue: "HRA overdue actions",
    likelihood: "Low",
    impact: "Low",
    mitigationOrComment: "Two actions due 10 Jun; owner assigned on WPS2 close-out.",
  },
];

export type ReportCostCategoryRow = {
  id: string;
  costCategory: string;
  approvedBudget: string;
  currentForecast: string;
  vsBudget: string;
  currentCommitted: string;
  currentUncommitted: string;
};

export const REPORT_COST_CATEGORIES: ReportCostCategoryRow[] = [
  {
    id: "cc-1",
    costCategory: "Land & Acquisition",
    approvedBudget: "£8.2M",
    currentForecast: "£8.1M",
    vsBudget: "-1.2%",
    currentCommitted: "£7.9M",
    currentUncommitted: "£0.2M",
  },
  {
    id: "cc-2",
    costCategory: "Design & Professional Fees",
    approvedBudget: "£4.5M",
    currentForecast: "£4.6M",
    vsBudget: "+2.2%",
    currentCommitted: "£4.1M",
    currentUncommitted: "£0.5M",
  },
  {
    id: "cc-3",
    costCategory: "Construction — Shell & Core",
    approvedBudget: "£42.0M",
    currentForecast: "£43.2M",
    vsBudget: "+2.9%",
    currentCommitted: "£38.4M",
    currentUncommitted: "£4.8M",
  },
  {
    id: "cc-4",
    costCategory: "MEP & PTU Fit-out",
    approvedBudget: "£28.5M",
    currentForecast: "£29.1M",
    vsBudget: "+2.1%",
    currentCommitted: "£22.0M",
    currentUncommitted: "£7.1M",
  },
  {
    id: "cc-5",
    costCategory: "Utilities & Connections",
    approvedBudget: "£6.8M",
    currentForecast: "£7.0M",
    vsBudget: "+2.9%",
    currentCommitted: "£5.2M",
    currentUncommitted: "£1.8M",
  },
];

export type ReportUsesCategoryRow = {
  id: string;
  usesCategory: string;
  total: string;
  committed: string;
  uncommitted: string;
};

export const REPORT_SUMMARY_USES: ReportUsesCategoryRow[] = [
  { id: "u-1", usesCategory: "Development spend", total: "£62.4M", committed: "£54.1M", uncommitted: "£8.3M" },
  { id: "u-2", usesCategory: "Contingency", total: "£4.2M", committed: "£0.8M", uncommitted: "£3.4M" },
  { id: "u-3", usesCategory: "Fees & misc", total: "£2.1M", committed: "£1.9M", uncommitted: "£0.2M" },
];

export type ReportSourceRow = {
  id: string;
  source: string;
  total: string;
  undrawn: string;
  drawn: string;
};

export const REPORT_SUMMARY_SOURCES: ReportSourceRow[] = [
  { id: "s-1", source: "Equity", total: "£45.0M", undrawn: "£8.0M", drawn: "£37.0M" },
  { id: "s-2", source: "Debt facility", total: "£28.0M", undrawn: "£12.5M", drawn: "£15.5M" },
  { id: "s-3", source: "Customer contributions", total: "£6.0M", undrawn: "£1.2M", drawn: "£4.8M" },
];

export const REPORT_CASHFLOW_PROGRAMME = {
  programmePeriod: "Apr 2026 — Mar 2027",
  committed: "£68.7M",
  expenditure: "£52.4M",
} as const;

export type ReportUploadHistoryRow = {
  id: string;
  reportingPeriod: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
};

export type ReportSnapshotRow = {
  id: string;
  reportingPeriod: string;
  reportDate: string;
  publishedBy: string;
  publishedAt: string;
  dashboardStatus: string;
};

export const REPORT_UPLOAD_HISTORY: ReportUploadHistoryRow[] = [
  {
    id: "u-1",
    reportingPeriod: "Week 22 · May 2026",
    fileName: "GreenSquare_Weekly_Report_W22.xlsx",
    uploadedBy: "Project controls",
    uploadedAt: "02 Jun 2026 · 09:14",
    status: "Processed",
  },
  {
    id: "u-2",
    reportingPeriod: "Week 21 · May 2026",
    fileName: "GreenSquare_Weekly_Report_W21.xlsx",
    uploadedBy: "Project controls",
    uploadedAt: "26 May 2026 · 16:42",
    status: "Processed",
  },
];

export const REPORT_PUBLISHED_SNAPSHOTS: ReportSnapshotRow[] = [
  {
    id: "s-1",
    reportingPeriod: "Week 22 · May 2026",
    reportDate: "02 Jun 2026",
    publishedBy: "GSDC lead",
    publishedAt: "02 Jun 2026 · 10:30",
    dashboardStatus: "Published",
  },
  {
    id: "s-2",
    reportingPeriod: "Week 21 · May 2026",
    reportDate: "26 May 2026",
    publishedBy: "GSDC lead",
    publishedAt: "26 May 2026 · 17:05",
    dashboardStatus: "Published",
  },
];

export const REPORT_SETTINGS_MOCK = {
  reportingCadence: "Weekly (Friday close) — GreenSquare template",
  defaultTemplate: "GreenSquare Weekly Report (New Cover 1 & 2)",
  dashboardVisibility: "GSDC, customer steering group, programme leads",
  approvalWorkflow: "Upload Excel → validate covers → publish live URL snapshot",
} as const;
