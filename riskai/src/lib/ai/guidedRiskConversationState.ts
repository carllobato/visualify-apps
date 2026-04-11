import { z } from "zod";

const confidenceSchema = z.enum(["low", "medium", "high"]);

const appliesToSchema = z.enum(["Cost", "Time", "Cost & Time"]);

const mitigationStatusSchema = z.enum(["Open", "Monitoring", "Mitigating"]);

const probabilityValueSchema = z.union([z.string(), z.number()]);

const nextQuestionFocusSchema = z.enum([
  "risk_clarity",
  "inherent",
  "mitigation",
  "mitigation_in_place",
  "residual",
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
    impact: z
      .object({
        appliesTo: appliesToSchema.optional(),
        costDetail: z.string().optional(),
        timeDetail: z.string().optional(),
      })
      .default({}),
    inherent: z
      .object({
        probability: probabilityValueSchema.optional(),
        cost: z.string().optional(),
        time: z.string().optional(),
      })
      .default({}),
    residual: z
      .object({
        probability: probabilityValueSchema.optional(),
        cost: z.string().optional(),
        time: z.string().optional(),
      })
      .default({}),
    mitigation: z
      .object({
        exists: z.boolean().nullable().default(null),
        inPlace: z.boolean().nullable().optional(),
        description: z.string().optional(),
        status: mitigationStatusSchema.optional(),
        rationale: z.string().optional(),
      })
      .default({ exists: null }),
  }),
  sufficiency: z.object({
    riskClear: z.boolean(),
    inherentClear: z.boolean(),
    mitigationClear: z.boolean(),
    mitigationInPlaceClear: z.boolean(),
    residualClear: z.boolean(),
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
      inherent: {},
      residual: {},
      mitigation: {
        exists: null,
        inPlace: null,
      },
    },
    sufficiency: {
      riskClear: false,
      inherentClear: false,
      mitigationClear: false,
      mitigationInPlaceClear: false,
      residualClear: false,
      readyToCreate: false,
    },
    missingFields: [],
  };
}
