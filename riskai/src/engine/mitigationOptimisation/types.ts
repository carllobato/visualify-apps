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
  bestROIBandBenefit: number;
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
