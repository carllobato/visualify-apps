import type { GuidedRiskConversationState } from "./guidedRiskConversationState";

const CONFIDENCE_VALUES = new Set<GuidedRiskConversationState["summary"]["confidence"]>([
  "low",
  "medium",
  "high",
]);

const MISSING_ORDER = [
  { key: "risk_clarity" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.riskClear },
  { key: "category" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.categorySet },
  { key: "impact" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.impactClear },
  { key: "mitigation" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.mitigationClear },
  { key: "owner" as const, satisfied: (s: GuidedRiskConversationState["sufficiency"]) => s.ownerSet },
];

export function normalizeGuidedRiskConversationState(
  state: GuidedRiskConversationState,
): GuidedRiskConversationState {
  const rawConfidence = state.summary.confidence;
  const confidence = CONFIDENCE_VALUES.has(rawConfidence) ? rawConfidence : "low";

  const { sufficiency: sIn } = state;
  const readyToCreate =
    sIn.riskClear &&
    sIn.categorySet &&
    sIn.impactClear &&
    sIn.mitigationClear &&
    sIn.ownerSet;

  const mitigation = { ...state.fields.mitigation };
  if (mitigation.status === "Monitoring" || mitigation.status === "Mitigating") {
    mitigation.exists = true;
  } else if (mitigation.status === "Open") {
    mitigation.exists = false;
  } else if (mitigation.exists === false) {
    mitigation.status = "Open";
  }

  const sufficiency: GuidedRiskConversationState["sufficiency"] = {
    ...sIn,
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
      impact: { ...state.fields.impact },
      mitigation,
    },
    sufficiency,
    nextQuestionFocus,
    missingFields,
  };
}
