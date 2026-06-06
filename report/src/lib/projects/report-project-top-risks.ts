import type { ReportProjectTrend } from "@/lib/projects/report-project-trend";

export type ReportProjectTopRisk = {
  id: string;
  title: string;
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

/** Placeholder until report Excel upload supplies top risks. */
export const REPORT_PROJECT_TOP_RISKS_PLACEHOLDER: ReportProjectTopRisk[] = [
  {
    id: "risk-1",
    title: "11kV energisation delay",
    category: "Power & Utilities",
    likelihood: "Medium",
    impact: "High",
    comment: "Weekly ESB coordination; contingency programme path modelled.",
    trend: { text: "Escalated vs last report", sentiment: "unfavorable" },
  },
  {
    id: "risk-2",
    title: "Customer NRC execution slip",
    category: "Customer",
    likelihood: "Medium",
    impact: "Medium",
    comment: "Legal fast-track review; executive escalation with customer.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "risk-3",
    title: "Chiller lead time",
    category: "Procurement",
    likelihood: "Low",
    impact: "High",
    comment: "Early order placed; alternate supplier qualified.",
    trend: { text: "New this period", sentiment: "unfavorable" },
  },
  {
    id: "risk-4",
    title: "PTU commissioning resource",
    category: "Construction",
    likelihood: "Medium",
    impact: "Medium",
    comment: "Commissioning agent appointed; float on Hall A programme.",
    trend: { text: "Unchanged vs last report", sentiment: "neutral" },
  },
  {
    id: "risk-5",
    title: "HRA overdue actions",
    category: "Safety",
    likelihood: "Low",
    impact: "Low",
    comment: "Two actions due 10 Jun; owner assigned on WPS2 close-out.",
    trend: { text: "Improved vs last report", sentiment: "favorable" },
  },
];

export function getReportProjectTopRiskCallout(
  risk: ReportProjectTopRisk,
): { title: string; body: string } {
  return {
    title: risk.title,
    body: `Likelihood: ${risk.likelihood}. Impact: ${risk.impact}. ${risk.comment}`,
  };
}
