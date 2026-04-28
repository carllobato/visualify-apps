export type RiskControlScoreRag = "green" | "amber" | "red";

export type RiskControlScoreBreakdown = {
  dataFreshness: number;
  highRiskHandling: number;
  credibility: number;
};

export type RiskControlScoreResult = {
  score: number;
  rag: RiskControlScoreRag;
  breakdown: RiskControlScoreBreakdown;
};

type RatingLike = {
  level?: string | null;
  score?: number | null;
  probability?: number | null;
  consequence?: number | null;
};

type RiskControlScoreRisk = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  owner?: string | null;
  status?: string | null;
  mitigation?: string | null;
  mitigation_description?: string | null;
  inherentRating?: RatingLike | null;
  residualRating?: RatingLike | null;
  pre_probability?: number | null;
  pre_cost_ml?: number | null;
  pre_time_ml?: number | null;
  post_probability?: number | null;
  post_cost_ml?: number | null;
  post_time_ml?: number | null;
  last_reviewed_at?: string | null;
  last_review_month?: string | null;
};

type RiskControlScoreSnapshot = {
  created_at?: string | null;
  locked_at?: string | null;
  report_month?: string | null;
  risk_count?: number | null;
  payload?: {
    inputs_used?: unknown[] | null;
    risks?: unknown[] | null;
  } | null;
} | null;

export type ComputeRiskControlScoreInput = {
  risks: RiskControlScoreRisk[];
  latestSnapshot: RiskControlScoreSnapshot;
};

const REPORTING_RECENCY_POINTS = 15;
const REVIEW_COVERAGE_POINTS = 15;
const HIGH_RISK_HANDLING_POINTS = 40;
const CREDIBILITY_COVERAGE_POINTS = 10;
const CREDIBILITY_CLARITY_POINTS = 10;
const CREDIBILITY_ACTIONABILITY_POINTS = 10;
const RECENT_REPORTING_DAYS = 30;
const CURRENT_REPORTING_DAYS = 45;
const STALE_REPORTING_DAYS = 60;
const MINIMUM_CREDIBLE_RISK_COUNT = 15;

function roundScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ragFromScore(score: number): RiskControlScoreRag {
  if (score >= 80) return "green";
  if (score >= 55) return "amber";
  return "red";
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function mitigationText(risk: RiskControlScoreRisk): string | null | undefined {
  return risk.mitigation_description ?? risk.mitigation;
}

function normalizedStatus(risk: RiskControlScoreRisk): string {
  return (risk.status ?? "").trim().toLowerCase();
}

function isActiveRisk(risk: RiskControlScoreRisk): boolean {
  const status = normalizedStatus(risk);
  return status !== "draft" && status !== "closed" && status !== "archived";
}

function costToConsequenceScale(cost: number): number {
  if (cost <= 50_000) return 1;
  if (cost <= 200_000) return 2;
  if (cost <= 500_000) return 3;
  if (cost <= 1_500_000) return 4;
  return 5;
}

function timeDaysToConsequenceScale(days: number): number {
  if (days <= 7) return 1;
  if (days <= 30) return 2;
  if (days <= 90) return 3;
  if (days <= 180) return 4;
  return 5;
}

function levelFromScore(score: number): string {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 16) return "high";
  return "extreme";
}

function levelFromRating(rating: RatingLike | null | undefined): string | null {
  const level = rating?.level?.trim().toLowerCase();
  if (level) return level;

  const score = Number(rating?.score);
  if (Number.isFinite(score) && score > 0) return levelFromScore(score);

  const probability = Number(rating?.probability);
  const consequence = Number(rating?.consequence);
  if (Number.isFinite(probability) && Number.isFinite(consequence)) {
    return levelFromScore(probability * consequence);
  }

  return null;
}

function levelFromDbFields(
  probabilityValue: number | null | undefined,
  costMlValue: number | null | undefined,
  timeMlValue: number | null | undefined
): string | null {
  const probability = Number(probabilityValue);
  if (!Number.isFinite(probability) || probability <= 0) return null;

  const costMl = Number(costMlValue);
  const timeMl = Number(timeMlValue);
  const consequence = Math.max(
    costToConsequenceScale(Number.isFinite(costMl) ? costMl : 0),
    timeDaysToConsequenceScale(Number.isFinite(timeMl) ? timeMl : 0)
  );

  return levelFromScore(probability * consequence);
}

function currentRiskLevel(risk: RiskControlScoreRisk): string | null {
  const status = normalizedStatus(risk);
  if (status === "draft" || status === "closed" || status === "archived") return null;

  if (status === "mitigating" || status === "mitigated") {
    if (!hasText(mitigationText(risk))) return null;
    return (
      levelFromRating(risk.residualRating) ??
      levelFromDbFields(risk.post_probability, risk.post_cost_ml, risk.post_time_ml)
    );
  }

  return (
    levelFromRating(risk.inherentRating) ??
    levelFromDbFields(risk.pre_probability, risk.pre_cost_ml, risk.pre_time_ml)
  );
}

function isHighOrExtremeRisk(risk: RiskControlScoreRisk): boolean {
  const level = currentRiskLevel(risk);
  return level === "high" || level === "extreme";
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function reportingRecencyScore(latestSnapshot: RiskControlScoreSnapshot, nowMs: number): number {
  const timestamp = parseTimestamp(latestSnapshot?.locked_at) ?? parseTimestamp(latestSnapshot?.created_at);
  if (timestamp == null) return 0;

  const ageDays = Math.max(0, (nowMs - timestamp) / 86_400_000);
  if (ageDays <= RECENT_REPORTING_DAYS) return REPORTING_RECENCY_POINTS;
  if (ageDays <= CURRENT_REPORTING_DAYS) return 10;
  if (ageDays <= STALE_REPORTING_DAYS) return 5;
  return 0;
}

function yearMonthFromDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function targetReviewMonth(latestSnapshot: RiskControlScoreSnapshot, nowMs: number): string {
  const reportMonth = latestSnapshot?.report_month?.slice(0, 7);
  if (reportMonth && /^\d{4}-\d{2}$/.test(reportMonth)) return reportMonth;

  const timestamp = parseTimestamp(latestSnapshot?.locked_at) ?? parseTimestamp(latestSnapshot?.created_at);
  return yearMonthFromDate(new Date(timestamp ?? nowMs));
}

function wasReviewedInMonth(risk: RiskControlScoreRisk, month: string): boolean {
  if (risk.last_review_month?.slice(0, 7) === month) return true;

  const reviewedAt = parseTimestamp(risk.last_reviewed_at);
  if (reviewedAt == null) return false;
  return yearMonthFromDate(new Date(reviewedAt)) === month;
}

function reviewCoverageScore(
  risks: RiskControlScoreRisk[],
  latestSnapshot: RiskControlScoreSnapshot,
  nowMs: number
): number {
  if (risks.length === 0) return REVIEW_COVERAGE_POINTS;

  const month = targetReviewMonth(latestSnapshot, nowMs);
  const reviewedCount = risks.filter((risk) => wasReviewedInMonth(risk, month)).length;
  const reviewedRatio = reviewedCount / risks.length;
  if (reviewedRatio >= 0.8) return REVIEW_COVERAGE_POINTS;
  if (reviewedRatio >= 0.5) return 10;
  if (reviewedRatio >= 0.2) return 5;
  return 0;
}

function highRiskHandlingScore(risks: RiskControlScoreRisk[]): number {
  const highRisks = risks.filter(isHighOrExtremeRisk);
  if (highRisks.length === 0) return HIGH_RISK_HANDLING_POINTS;

  const mitigatedCount = highRisks.filter((risk) => hasText(mitigationText(risk))).length;
  const handledRatio = mitigatedCount / highRisks.length;

  if (handledRatio >= 0.9) return HIGH_RISK_HANDLING_POINTS;
  if (handledRatio >= 0.7) return 30;
  if (handledRatio >= 0.4) return 15;
  return 0;
}

function credibilityCoverageScore(risks: RiskControlScoreRisk[]): number {
  if (risks.length === 0) return 0;

  return Math.min(1, risks.length / MINIMUM_CREDIBLE_RISK_COUNT) * CREDIBILITY_COVERAGE_POINTS;
}

function credibilityClarityScore(risks: RiskControlScoreRisk[]): number {
  if (risks.length === 0) return 0;

  let total = 0;
  for (const risk of risks) {
    total += typeof risk.description === "string" && risk.description.trim().length > 20 ? 1 : 0;
  }

  return (total / risks.length) * CREDIBILITY_CLARITY_POINTS;
}

function credibilityActionabilityScore(risks: RiskControlScoreRisk[]): number {
  if (risks.length === 0) return 0;

  let total = 0;
  for (const risk of risks) {
    total += hasText(mitigationText(risk)) ? 1 : 0;
  }

  return (total / risks.length) * CREDIBILITY_ACTIONABILITY_POINTS;
}

export function computeRiskControlScore({
  risks,
  latestSnapshot,
}: ComputeRiskControlScoreInput): RiskControlScoreResult {
  const activeRisks = risks.filter(isActiveRisk);
  const nowMs = Date.now();

  const dataFreshnessRaw =
    reportingRecencyScore(latestSnapshot, nowMs) + reviewCoverageScore(activeRisks, latestSnapshot, nowMs);
  const highRiskHandlingRaw = highRiskHandlingScore(activeRisks);
  const credibilityRaw =
    credibilityCoverageScore(activeRisks) +
    credibilityClarityScore(activeRisks) +
    credibilityActionabilityScore(activeRisks);
  const dataFreshness = Math.min(30, dataFreshnessRaw);
  const highRiskHandling = Math.min(40, highRiskHandlingRaw);
  const credibility = Math.min(30, credibilityRaw);

  const breakdown = {
    dataFreshness: roundScore(dataFreshness),
    highRiskHandling: roundScore(highRiskHandling),
    credibility: roundScore(credibility),
  };
  const score = roundScore(breakdown.dataFreshness + breakdown.highRiskHandling + breakdown.credibility);

  return {
    score,
    rag: ragFromScore(score),
    breakdown,
  };
}
