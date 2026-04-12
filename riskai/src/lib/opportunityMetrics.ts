import type { Risk } from "@/domain/risk/risk.schema";
import { probability01FromScale } from "@/domain/risk/risk.logic";
import {
  SCHEDULE_IMPACT_DAYS_CAP,
  appliesToExcludesCost,
  appliesToExcludesTime,
  riskLifecycleBucketForRegisterSnapshot,
} from "@/domain/risk/riskFieldSemantics";

function hasMitigationPlan(risk: Risk): boolean {
  return Boolean(risk.mitigation?.trim());
}

function explicitOrInherentProbability01(risk: Risk): number {
  return typeof risk.probability === "number" && risk.probability >= 0 && risk.probability <= 1
    ? risk.probability
    : probability01FromScale(risk.inherentRating.probability);
}

export function preMitigationCostExpectedForOpportunity(risk: Risk): number {
  const impact = typeof risk.preMitigationCostML === "number" ? Math.max(0, risk.preMitigationCostML) : 0;
  const value = impact * explicitOrInherentProbability01(risk);
  return Number.isFinite(value) ? value : 0;
}

export function preMitigationScheduleExpectedForOpportunity(risk: Risk): number {
  const rawImpact = typeof risk.preMitigationTimeML === "number" ? risk.preMitigationTimeML : 0;
  const impactDays = Math.min(SCHEDULE_IMPACT_DAYS_CAP, Math.max(0, rawImpact));
  const value = impactDays * explicitOrInherentProbability01(risk);
  return Number.isFinite(value) ? value : 0;
}

export function monitoringCostOpportunityExpected(risk: Risk): number | null {
  if (!hasMitigationPlan(risk)) return null;
  if (riskLifecycleBucketForRegisterSnapshot(risk) !== "monitoring") return null;
  if (appliesToExcludesCost(risk.appliesTo)) return 0;

  const postCost = risk.postMitigationCostML;
  if (typeof postCost !== "number" || !Number.isFinite(postCost) || postCost < 0) return null;

  const pre = preMitigationCostExpectedForOpportunity(risk);
  const post = probability01FromScale(risk.residualRating.probability) * postCost;
  const delta = pre - post;
  return Number.isFinite(delta) ? delta : null;
}

export function monitoringScheduleOpportunityExpected(risk: Risk): number | null {
  if (!hasMitigationPlan(risk)) return null;
  if (riskLifecycleBucketForRegisterSnapshot(risk) !== "monitoring") return null;
  if (appliesToExcludesTime(risk.appliesTo)) return 0;

  const postTime = risk.postMitigationTimeML;
  if (typeof postTime !== "number" || !Number.isFinite(postTime) || postTime < 0) return null;

  const pre = preMitigationScheduleExpectedForOpportunity(risk);
  const post = probability01FromScale(risk.residualRating.probability) * Math.min(SCHEDULE_IMPACT_DAYS_CAP, postTime);
  const delta = pre - post;
  return Number.isFinite(delta) ? delta : null;
}
