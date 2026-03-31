export type BenefitMetric = "targetCostReduction";

export type MitigationCurvePoint = {
  incrementalSpend: number;
  cumulativeSpend: number;
  marginalBenefit: number;
  cumulativeBenefit: number;
  benefitPerDollar: number;
};

export type MitigationOptimisationRiskResult = {
  riskId: string;
  riskName: string;
  leverageScore: number;
  bestROIBand: { from: number; to: number };
  topBandBenefitPerDollar: number;
  explanation: string;
  curve: MitigationCurvePoint[];
};

export type MitigationOptimisationResult = {
  baseline: { neutralTargetCost: number; neutralTargetDays: number; targetPercent: number };
  ranked: MitigationOptimisationRiskResult[];
  rankedCost: MitigationOptimisationRiskResult[];
  rankedSchedule: MitigationOptimisationRiskResult[];
  meta: {
    spendStepsUsed: number[];
    metricUsed: BenefitMetric;
    usedFallbackMaterialityCount: number;
    usedDefaultMitigationParamsCount: number;
  };
  budgetPlan?: {
    budgetCap: number;
    totalProjectedBenefit: number;
    allocations: Array<{
      riskId: string;
      riskName: string;
      band: { from: number; to: number };
      spend: number;
      marginalBenefit: number;
      benefitPerDollar: number;
    }>;
  };
};

export function computeMitigationOptimisation(args: {
  risks: unknown[];
  neutralSnapshot: unknown;
  spendSteps?: number[];
  benefitMetric?: BenefitMetric;
  budgetCap?: number;
}): MitigationOptimisationResult {
  const spendStepsUsed = args.spendSteps ?? [0, 25_000, 50_000, 100_000, 200_000];

  // For now: minimal safe stub, no snapshot parsing yet.
  // Minimal safe stub.
  const neutralTargetCost = 0;
  const neutralTargetDays = 0;
  const targetPercent = 80;

  return {
    baseline: { neutralTargetCost, neutralTargetDays, targetPercent },
    ranked: [],
    rankedCost: [],
    rankedSchedule: [],
    meta: {
      spendStepsUsed,
      metricUsed: args.benefitMetric ?? "targetCostReduction",
      usedFallbackMaterialityCount: 0,
      usedDefaultMitigationParamsCount: 0,
    },
  };
}
