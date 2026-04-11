import "server-only";

import OpenAI from "openai";
import { env } from "@/lib/env";
import {
  createEmptyGuidedRiskConversationState,
  GuidedRiskConversationStateSchema,
  type GuidedRiskConversationState,
} from "./guidedRiskConversationState";
import { normalizeGuidedRiskConversationState } from "./normalizeGuidedRiskConversationState";
import { resolveCanonicalCategoryLabel } from "@/domain/risk/riskFieldSemantics";

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

## Allowed categories (exact strings) — optional metadata for downstream use
The following JSON array lists valid values for fields.category when the transcript clearly implies one. Copy verbatim when set.
If the best-fitting category is obvious from context, set fields.category to that **exact** string from the array.
If multiple categories could reasonably apply or the fit is unclear, omit fields.category.
${categoriesJson}

## summary
- summary.riskStatement: concise paraphrase of the risk event/issue if clear, else omit.
- summary.confidence: "low" | "medium" | "high" reflecting how well the transcript supports the derived state.

## fields.inherent (pre-mitigation / inherent exposure)
- probability: user's stated likelihood (string or number, e.g. "40%" or 40) when clearly given; else omit.
- cost: short text for cost impact (qualitative or quantitative) when clearly given; else omit.
- time: short text for schedule/time impact when clearly given; else omit.

## fields.residual (post-mitigation / revised exposure)
- probability, cost, time: same meaning as inherent, but for **after** mitigation — only when the user (or dialogue) has established revised figures; else omit.

## fields.mitigation
- description: the mitigation **strategy** or plan when discussed (even briefly); omit if not yet discussed.
- inPlace: true if mitigation is already implemented/active; false if not yet in place or only planned; null only when this was not answered or unclear.
- exists / status: optional legacy hints — "Open" = no meaningful mitigation; "Monitoring" / "Mitigating" per dialogue if clear.
- Align inPlace with dialogue when possible.

## fields.impact (derived by server from inherent in many cases)
- You may omit fields.impact; the server may set appliesTo from inherent cost/time when inherent is complete.

## Sufficiency flags (booleans)
- riskClear: true only when the risk event/issue is clearly stated (what could go wrong).
- inherentClear: true only when **all three** are clearly established in dialogue: inherent probability, inherent cost impact, and inherent time impact (each may be qualitative, e.g. order-of-magnitude cost, "a few weeks" delay) — not from vague severity alone without P/T/C substance.
- mitigationClear: true only when mitigation **strategy** is clear enough to record (what would be done or considered), OR the user explicitly states there is no mitigation / not yet defined in a way you can quote in fields.mitigation.description.
- mitigationInPlaceClear: true only when it is clear whether mitigation is already in place (inPlace can then be true or false).
- residualClear: true only when **revised** (residual) probability, cost, and time are all clearly established — same rigor as inherentClear, applied to post-mitigation figures. If mitigation eliminates impact, residual fields may be explicit zeros or "none" / "0 days" as stated.
- readyToCreate: set true only when ALL of riskClear, inherentClear, mitigationClear, mitigationInPlaceClear, and residualClear would be true per the rules above (the server recomputes readyToCreate; match your flags to the transcript).

## Other keys
- missingFields: optional string[] hint; server may replace with its own ordering.
- nextQuestionFocus: optional hint; server may normalize.

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

    if (categories.length === 0) {
      if (state.fields.category !== undefined) {
        const { category: _drop, ...restFields } = state.fields;
        state = {
          ...state,
          fields: restFields,
        };
      }
    } else {
      const cat = state.fields.category;
      if (cat !== undefined) {
        const resolved = resolveCanonicalCategoryLabel(cat, categories);
        if (allowed.has(resolved)) {
          state = {
            ...state,
            fields: { ...state.fields, category: resolved },
          };
        } else {
          const { category: _drop, ...restFields } = state.fields;
          state = {
            ...state,
            fields: restFields,
          };
        }
      }
    }

    return normalizeGuidedRiskConversationState(state);
  } catch {
    return createEmptyGuidedRiskConversationState();
  }
}
