import "server-only";

import OpenAI from "openai";
import { env } from "@/lib/env";
import {
  createEmptyGuidedRiskConversationState,
  GuidedRiskConversationStateSchema,
  type GuidedRiskConversationState,
} from "./guidedRiskConversationState";
import { normalizeGuidedRiskConversationState } from "./normalizeGuidedRiskConversationState";

function buildTranscriptBlock(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  return messages
    .map((m) => `${m.role === "user" ? "USER" : "ASSISTANT"}: ${m.content}`)
    .join("\n\n");
}

function stripJsonFence(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

function buildDerivationSystemPrompt(allowedCategories: string[]): string {
  const categoriesJson = JSON.stringify(allowedCategories);
  return `You derive a structured GuidedRiskConversationState JSON object from a risk-definition chat transcript.

## Rules
- Derive ONLY from the transcript. Do not invent facts not supported by the dialogue.
- Be conservative: only mark sufficiency flags when the criterion is clearly met from the text.
- If statements conflict, prefer the latest clear user statement.
- Output JSON only. No markdown, no commentary outside the JSON object.

## Allowed categories (exact strings)
The following JSON array lists the only valid values for fields.category. Set fields.category ONLY if it exactly matches one of these strings (character-for-character). Otherwise omit fields.category or leave it unset in your output and set sufficiency.categorySet to false.
${categoriesJson}

## summary
- summary.riskStatement: concise paraphrase of the risk if clear, else omit.
- summary.confidence: "low" | "medium" | "high" reflecting how well the transcript supports the derived state.

## fields
- fields.category: one of the allowed strings above, or omit if none apply exactly.
- fields.owner: specific owner / responsible role if clearly stated, else omit.
- fields.impact.appliesTo: "Cost" | "Time" | "Cost & Time" only when impact direction is clear enough to classify.
- fields.impact.costDetail / timeDetail: short text when relevant, else omit.
- fields.mitigation.exists: boolean or null when unknown.
- fields.mitigation.description / rationale: when helpful, else omit.
- fields.mitigation.status (when position is clear enough):
  - "Open" = no meaningful mitigation identified.
  - "Monitoring" = mitigation identified but not active / not yet implemented.
  - "Mitigating" = mitigation is active and expected to reduce exposure now.

## sufficiency (booleans)
- riskClear: true only when the risk event/issue is clearly stated.
- categorySet: true only when a valid allowed category is selected (exact match from the list).
- impactClear: true only when impact direction is clear enough to classify Cost / Time / Cost & Time.
- mitigationClear: true only when mitigation position is clear enough to classify Open / Monitoring / Mitigating.
- ownerSet: true only when a specific owner/responsible role is clear.
- readyToCreate: true only when ALL of riskClear, categorySet, impactClear, mitigationClear, and ownerSet are true.

## Other keys
- missingFields: use string[] of missing aspect keys in order of importance if you track them; the consumer may normalize this list.
- nextQuestionFocus: optional hint; consumer may normalize.

Return a single JSON object that conforms to this shape with keys: summary, fields, sufficiency, missingFields, and optional nextQuestionFocus.`;
}

export async function deriveGuidedRiskConversationState(args: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  categories: string[];
}): Promise<GuidedRiskConversationState> {
  try {
    const { messages, categories } = args;
    if (!Array.isArray(messages) || messages.length === 0) {
      return createEmptyGuidedRiskConversationState();
    }

    const transcript = buildTranscriptBlock(messages).trim();
    if (!transcript) {
      return createEmptyGuidedRiskConversationState();
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      fetch: globalThis.fetch,
      timeout: 60_000,
    });

    const system = buildDerivationSystemPrompt(categories);
    const userContent = `Transcript:\n\n${transcript}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      return createEmptyGuidedRiskConversationState();
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripJsonFence(rawText));
    } catch {
      return createEmptyGuidedRiskConversationState();
    }

    const result = GuidedRiskConversationStateSchema.safeParse(parsedJson);
    if (!result.success) {
      return createEmptyGuidedRiskConversationState();
    }

    const allowed = new Set(categories);
    let state: GuidedRiskConversationState = result.data;
    const cat = state.fields.category;

    if (cat !== undefined && !allowed.has(cat)) {
      const { category: _drop, ...restFields } = state.fields;
      state = {
        ...state,
        fields: restFields,
        sufficiency: {
          ...state.sufficiency,
          categorySet: false,
          readyToCreate: false,
        },
      };
    }

    return normalizeGuidedRiskConversationState(state);
  } catch {
    return createEmptyGuidedRiskConversationState();
  }
}
