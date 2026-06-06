export const REPORT_PROJECT_STAGES = [
  "Land Acquisition",
  "Due Diligence",
  "Development",
  "Delivery",
  "Operation",
] as const;

export type ReportProjectStage = (typeof REPORT_PROJECT_STAGES)[number];

export const REPORT_PROJECT_STAGE_DEFAULT: ReportProjectStage = "Development";

export function isReportProjectStage(value: string): value is ReportProjectStage {
  return (REPORT_PROJECT_STAGES as readonly string[]).includes(value);
}

export function parseReportProjectStage(value: unknown): ReportProjectStage | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return isReportProjectStage(trimmed) ? trimmed : null;
}

export function getReportProjectStageIndex(stage: ReportProjectStage): number {
  return REPORT_PROJECT_STAGES.indexOf(stage);
}

export type ReportProjectStageStatus = "completed" | "current" | "upcoming";

export function getReportProjectStageStatus(
  stageIndex: number,
  currentIndex: number,
): ReportProjectStageStatus {
  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "current";
  return "upcoming";
}
