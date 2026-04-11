import { z } from "zod";

const confidenceSchema = z.enum(["low", "medium", "high"]);

const appliesToSchema = z.enum(["Cost", "Time", "Cost & Time"]);

const mitigationStatusSchema = z.enum(["Open", "Monitoring", "Mitigating"]);

const nextQuestionFocusSchema = z.enum([
  "risk_clarity",
  "category",
  "impact",
  "mitigation",
  "owner",
  "confirm",
]);

export const GuidedRiskConversationStateSchema = z.object({
  summary: z.object({
    riskStatement: z.string().optional(),
    confidence: confidenceSchema,
  }),
  fields: z.object({
    category: z.string().optional(),
    owner: z.string().optional(),
    impact: z.object({
      appliesTo: appliesToSchema.optional(),
      costDetail: z.string().optional(),
      timeDetail: z.string().optional(),
    }),
    mitigation: z.object({
      exists: z.boolean().nullable(),
      description: z.string().optional(),
      status: mitigationStatusSchema.optional(),
      rationale: z.string().optional(),
    }),
  }),
  sufficiency: z.object({
    riskClear: z.boolean(),
    categorySet: z.boolean(),
    impactClear: z.boolean(),
    mitigationClear: z.boolean(),
    ownerSet: z.boolean(),
    readyToCreate: z.boolean(),
  }),
  nextQuestionFocus: nextQuestionFocusSchema.optional(),
  missingFields: z.array(z.string()),
});

export type GuidedRiskConversationState = z.infer<typeof GuidedRiskConversationStateSchema>;

export function createEmptyGuidedRiskConversationState(): GuidedRiskConversationState {
  return {
    summary: {
      confidence: "low",
    },
    fields: {
      impact: {},
      mitigation: {
        exists: null,
      },
    },
    sufficiency: {
      riskClear: false,
      categorySet: false,
      impactClear: false,
      mitigationClear: false,
      ownerSet: false,
      readyToCreate: false,
    },
    missingFields: [],
  };
}
