export type ReportProjectTrend = {
  text: string;
  sentiment: "favorable" | "unfavorable" | "neutral";
};

export function getReportTrendToneClass(sentiment: ReportProjectTrend["sentiment"]): string {
  switch (sentiment) {
    case "favorable":
      return "text-[var(--ds-status-success-fg)]";
    case "unfavorable":
      return "text-[var(--ds-status-danger-fg)]";
    default:
      return "text-[var(--ds-text-primary)]";
  }
}
