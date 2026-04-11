import type { GuidedRiskConversationState } from "./guidedRiskConversationState";

const CONFIDENCE_VALUES = new Set<GuidedRiskConversationState["summary"]["confidence"]>([
  "low",
  "medium",
  "high",
]);

function nonEmptyProbability(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "number" && !Number.isNaN(value)) return true;
  if (typeof value === "string" && value.trim().length > 0) return true;
  return false;
}

function nonEmptyText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function deriveAppliesToFromInherent(
  inherent: GuidedRiskConversationState["fields"]["inherent"],
): GuidedRiskConversationState["fields"]["impact"]["appliesTo"] | undefined {
  const hasCost = nonEmptyText(inherent.cost);
  const hasTime = nonEmptyText(inherent.time);
  if (hasCost && hasTime) return "Cost & Time";
  if (hasCost) return "Cost";
  if (hasTime) return "Time";
  return undefined;
}

const MISSING_ORDER = [
  { key: "risk_clarity" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.riskClear },
  {
    key: "inherent" as const,
    satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.inherentClear,
  },
  {
    key: "mitigation" as const,
    satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.mitigationClear,
  },
  {
    key: "mitigation_in_place" as const,
    satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.mitigationInPlaceClear,
  },
  {
    key: "residual" as const,
    satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.residualClear,
  },
];

export function normalizeGuidedRiskConversationState(
  state: GuidedRiskConversationState,
): GuidedRiskConversationState {
  const rawConfidence = state.summary.confidence;
  const confidence = CONFIDENCE_VALUES.has(rawConfidence) ? rawConfidence : "low";

  const { sufficiency: sIn } = state;
  const inherent = { ...state.fields.inherent };
  const residual = { ...state.fields.residual };

  /** LLM flags alone are not enough — require concrete inherent P / cost / time text. */
  const inherentClear =
    sIn.inherentClear &&
    nonEmptyProbability(inherent.probability) &&
    nonEmptyText(inherent.cost) &&
    nonEmptyText(inherent.time);

  const mitigation = { ...state.fields.mitigation };
  if (mitigation.inPlace === true) {
    mitigation.exists = true;
  } else if (mitigation.inPlace === false) {
    mitigation.exists = false;
  }
  if (mitigation.status === "Monitoring" || mitigation.status === "Mitigating") {
    mitigation.exists = true;
  } else if (mitigation.status === "Open") {
    mitigation.exists = false;
  } else if (mitigation.exists === false) {
    mitigation.status = "Open";
  }

  const mitigationClear =
    sIn.mitigationClear && nonEmptyText(mitigation.description);

  const inPlaceKnown = mitigation.inPlace === true || mitigation.inPlace === false;
  const mitigationInPlaceClear = sIn.mitigationInPlaceClear && inPlaceKnown;

  const residualClear =
    sIn.residualClear &&
    nonEmptyProbability(residual.probability) &&
    nonEmptyText(residual.cost) &&
    nonEmptyText(residual.time);

  const appliesTo = inherentClear ? deriveAppliesToFromInherent(inherent) : undefined;
  const impact = {
    ...state.fields.impact,
    ...(appliesTo !== undefined ? { appliesTo } : {}),
    ...(nonEmptyText(inherent.cost) ? { costDetail: inherent.cost } : {}),
    ...(nonEmptyText(inherent.time) ? { timeDetail: inherent.time } : {}),
  };

  const readyToCreate =
    inherentClear &&
    mitigationClear &&
    mitigationInPlaceClear &&
    residualClear &&
    sIn.riskClear;

  const sufficiency: GuidedRiskConversationState["sufficiency"] = {
    riskClear: sIn.riskClear,
    inherentClear,
    mitigationClear,
    mitigationInPlaceClear,
    residualClear,
    readyToCreate,
  };

  const missingFields: string[] = [];
  for (const { key, satisfied } of MISSING_ORDER) {
    if (!satisfied(sufficiency)) missingFields.push(key);
  }

  let nextQuestionFocus: GuidedRiskConversationState["nextQuestionFocus"];
  if (readyToCreate) {
    nextQuestionFocus = "confirm";
  } else {
    const first = MISSING_ORDER.find(({ satisfied }) => !satisfied(sufficiency));
    nextQuestionFocus = first?.key;
  }

  return {
    summary: {
      ...state.summary,
      confidence,
    },
    fields: {
      ...state.fields,
      inherent,
      residual,
      impact,
      mitigation,
    },
    sufficiency,
    nextQuestionFocus,
    missingFields,
  };
}
