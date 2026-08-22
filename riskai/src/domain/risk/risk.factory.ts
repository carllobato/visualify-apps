import type { Risk, RiskCategory, RiskStatus } from "./risk.schema";
import { buildRating } from "./risk.logic";
import { makeId } from "@/lib/id";
import { nowIso } from "@/lib/time";
import { isRiskStatusDraft } from "./riskFieldSemantics";

const DEFAULT_MITIGATION_PROFILE = {
  status: "active" as const,
  effectiveness: 0.6,
  confidence: 0.7,
  reduces: 0.5,
  lagMonths: 3,
};

/** Sample defaults for dev fixtures only — explicit partial keys (even undefined) win. */
function partialField<K extends keyof Risk>(
  partial: Partial<Risk> | undefined,
  key: K,
  sampleDefault: Risk[K]
): Risk[K] {
  if (partial != null && key in partial) return partial[key] as Risk[K];
  return sampleDefault;
}

export function createRisk(partial?: Partial<Risk>): Risk {
  const createdAt = nowIso();

  const rawCat = partial?.category;
  const statusIncoming = partial?.status;
  const category: RiskCategory =
    typeof rawCat === "string" && rawCat.trim().length > 0
      ? rawCat.trim()
      : isRiskStatusDraft(statusIncoming)
        ? ""
        : "commercial";
  const status: RiskStatus = partial?.status ?? "open";

  const inherentRating = partial?.inherentRating ?? buildRating(3, 3);
  const residualRating = partial?.residualRating ?? inherentRating;

  return {
    id: partial?.id ?? makeId(),
    riskNumber: partial?.riskNumber,
    title: partial?.title ?? "Sample risk: Long lead switchgear",
    description: partial?.description,

    category,
    status,

    owner: partial?.owner,
    mitigation: partialField(
      partial,
      "mitigation",
      "Confirm lead times, place early order, consider alternates"
    ),
    contingency: partial?.contingency,

    inherentRating,
    residualRating,

    dueDate: partial?.dueDate,

    appliesTo: partial?.appliesTo ?? "both",
    preMitigationCostMin: partial?.preMitigationCostMin,
    preMitigationCostML: partialField(partial, "preMitigationCostML", 50_000),
    preMitigationCostMax: partial?.preMitigationCostMax,
    preMitigationTimeMin: partial?.preMitigationTimeMin,
    preMitigationTimeML: partialField(partial, "preMitigationTimeML", 30),
    preMitigationTimeMax: partial?.preMitigationTimeMax,
    mitigationCost: partial?.mitigationCost,
    postMitigationCostMin: partial?.postMitigationCostMin,
    postMitigationCostML: partial?.postMitigationCostML,
    postMitigationCostMax: partial?.postMitigationCostMax,
    postMitigationTimeMin: partial?.postMitigationTimeMin,
    postMitigationTimeML: partial?.postMitigationTimeML,
    postMitigationTimeMax: partial?.postMitigationTimeMax,
    preMitigationProbabilityPct: partial?.preMitigationProbabilityPct,
    postMitigationProbabilityPct: partial?.postMitigationProbabilityPct,

    probability: partialField(partial, "probability", 0.4),
    escalationPersistence: partial?.escalationPersistence ?? 0.5,
    sensitivity: partial?.sensitivity ?? 0.5,
    timeProfile: partial?.timeProfile ?? "mid",
    mitigationProfile: partial?.mitigationProfile ?? DEFAULT_MITIGATION_PROFILE,

    createdAt: partial?.createdAt ?? createdAt,
    updatedAt: partial?.updatedAt ?? createdAt,

    closureNote: partial?.closureNote,
    closedAt: partial?.closedAt,
    closedBy: partial?.closedBy,
    createdBy: partial?.createdBy,
    lastReviewedAt: partial?.lastReviewedAt,
    lastReviewedBy: partial?.lastReviewedBy,
  };
}
