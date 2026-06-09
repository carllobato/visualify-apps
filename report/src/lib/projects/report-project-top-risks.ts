import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectTopRisk = {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: string;
  impact: string;
  comment: string;
  trend: ReportProjectTrend;
};

const REPORT_TOP_RISK_LIKELIHOOD_SCORE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const REPORT_TOP_RISK_IMPACT_SCORE: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export function getReportProjectTopRiskRagStatus(
  risk: Pick<ReportProjectTopRisk, "likelihood" | "impact">,
): string {
  const likelihood =
    REPORT_TOP_RISK_LIKELIHOOD_SCORE[risk.likelihood.toLowerCase()] ?? 1;
  const impact = REPORT_TOP_RISK_IMPACT_SCORE[risk.impact.toLowerCase()] ?? 1;
  const score = likelihood * impact;

  if (score >= 6) return "Red";
  if (score >= 3) return "Amber";
  return "Green";
}

const REPORT_TOP_RISK_RAG_SORT_ORDER: Record<string, number> = {
  red: 0,
  amber: 1,
  yellow: 1,
  green: 2,
};

function getReportProjectTopRiskRagSortOrder(
  risk: Pick<ReportProjectTopRisk, "likelihood" | "impact">,
): number {
  const ragStatus = getReportProjectTopRiskRagStatus(risk).toLowerCase();
  return REPORT_TOP_RISK_RAG_SORT_ORDER[ragStatus] ?? 3;
}

export function compareReportProjectTopRisksByRagStatus(
  a: ReportProjectTopRisk,
  b: ReportProjectTopRisk,
): number {
  const ragOrder = getReportProjectTopRiskRagSortOrder(a) - getReportProjectTopRiskRagSortOrder(b);
  if (ragOrder !== 0) {
    return ragOrder;
  }

  return a.title.localeCompare(b.title);
}

export function sortReportProjectTopRisksByRagStatus(
  risks: ReportProjectTopRisk[],
): ReportProjectTopRisk[] {
  return [...risks].sort(compareReportProjectTopRisksByRagStatus);
}

/** Placeholder until report Excel upload supplies top risks. */
export const REPORT_PROJECT_TOP_RISKS_PLACEHOLDER: ReportProjectTopRisk[] = [
  {
    id: "risk-1",
    title: "11kV energisation delay",
    description:
      "ESB grid connection works remain on the critical path; energisation date has slipped twice this quarter.",
    category: "Power & Utilities",
    likelihood: "Medium",
    impact: "High",
    comment: "Weekly ESB coordination; contingency programme path modelled.",
    trend: { text: "Escalated vs last report", sentiment: "unfavorable" },
  },
  {
    id: "risk-2",
    title: "Customer NRC execution slip",
    description:
      "Customer network readiness criteria are not yet signed off, threatening the handover window for Hall A.",
    category: "Customer",
    likelihood: "Medium",
    impact: "Medium",
    comment: "Legal fast-track review; executive escalation with customer.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "risk-3",
    title: "Chiller lead time",
    description:
      "Long-lead mechanical plant delivery is tracking beyond the procurement allowance for the cooling yard install.",
    category: "Construction",
    likelihood: "Low",
    impact: "High",
    comment: "Early order placed; alternate supplier qualified.",
    trend: { text: "New this period", sentiment: "unfavorable" },
  },
  {
    id: "risk-4",
    title: "PTU commissioning resource",
    description:
      "Specialist commissioning capacity is constrained across overlapping PTU and white-space fit-out phases.",
    category: "Construction",
    likelihood: "Medium",
    impact: "Medium",
    comment: "Commissioning agent appointed; float retained on Hall A programme.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "risk-5",
    title: "Planning condition discharge",
    description:
      "Outstanding planning conditions on the south access road could delay final occupation certificate.",
    category: "Authority",
    likelihood: "Medium",
    impact: "Medium",
    comment: "Authority workshop scheduled; south access road design resubmitted.",
    trend: { text: "Improved vs last report", sentiment: "favorable" },
  },
];
