export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireUser } from "@/lib/auth/requireUser";
import { IntelligentExtractDraftSchema } from "@/domain/risk/risk.schema";
import {
  GuidedRiskConversationStateSchema,
  type GuidedRiskConversationState,
} from "@/lib/ai/guidedRiskConversationState";
import { checkAiRateLimit, buildRateLimit429Payload } from "@/server/ai/rate-limit";
import { estimateOpenAiChatCostUsd } from "@/server/ai/openai-usage-cost";
import { env } from "@/lib/env";
import { supabaseServerClient } from "@/lib/supabase/server";

const USAGE_LOG_PREFIX = "[visualify_ai_usage extract-risk]";

const EXTRACT_CATEGORY_LEGACY = `## 4. Category (exactly one)
Classify using keywords; use lowercase. Valid: commercial, programme, design, construction, procurement, hse, authority, operations, other.
- procurement: supplier, long lead, manufacturing, capacity, switchgear, equipment, factory
- design: IFC, approval, design review
- authority: grid, utility, planning
- commercial: variation, claim, contract
- construction: site, labour, weather
- programme: delay, schedule, programme
- hse: safety, health, environment
- operations: operations, handover
- other: when none of the above fit`;

function buildExtractCategorySection(categories: string[]): string {
  if (categories.length === 0) {
    return EXTRACT_CATEGORY_LEGACY;
  }
  const listed = categories.map((c) => `- "${c}"`).join("\n");
  return `## 4. Category (exactly one)
You MUST set "category" to exactly one of the following strings from this project's configured risk categories. Copy the value verbatim (spelling, spacing, casing, punctuation):
${listed}

Do not output internal slugs or generic lowercase keys (for example do not use "hse" or "authority" unless that exact string appears in the list above). Choose the single best-matching label from the list.`;
}

/** Optional flags from risk-chat so extraction does not invent cost/time when impact was never established. */
type GuidedExtractImpact = {
  impactClear?: boolean;
  appliesTo?: "Cost" | "Time" | "Cost & Time";
};

function parseConversationState(raw: unknown): GuidedRiskConversationState | null {
  const r = GuidedRiskConversationStateSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/**
 * When the guided chat supplied a full structured state, attach it so extraction maps
 * inherent → pre-mitigation fields and residual → post-mitigation fields conservatively.
 */
function buildStructuredConversationStateAppendix(state: GuidedRiskConversationState): string {
  const payload = {
    summary: state.summary,
    sufficiency: state.sufficiency,
    fields: {
      inherent: state.fields.inherent,
      mitigation: {
        description: state.fields.mitigation.description,
        inPlace: state.fields.mitigation.inPlace ?? null,
      },
      residual: state.fields.residual,
      impact: state.fields.impact,
      category: state.fields.category,
      owner: state.fields.owner,
    },
  };
  const json = JSON.stringify(payload);
  return `## STRUCTURED CONVERSATION STATE
The client sent this JSON from the guided risk chat (normalized server state). It is **supporting context** for the same conversation as the user transcript.

\`\`\`json
${json}
\`\`\`

### How to use this block
- Prefer mapping these fields into the extraction output **together with** the user-message transcript.
- If the transcript **clearly contradicts** this JSON on a specific fact, **use the transcript** for that fact.
- **Do not invent** dollar amounts, day counts, or probability percentages that are not grounded in either this JSON or the transcript. If a numeric value cannot be justified, use **0** for required pre-mitigation cost/time fields (and set \`appliesTo\` consistently: cost-only / time-only / both from what is evidenced).
- **Inherent mapping (pre-mitigation):** interpret \`fields.inherent.probability\`, \`.cost\`, and \`.time\` into \`probability\` (0–100), \`costMin\` / \`costMostLikely\` / \`costMax\`, \`timeMin\` / \`timeMostLikely\` / \`timeMax\`. Use qualitative text only to derive numeric bands when the wording supports a defensible conversion; otherwise **0**.
- **Residual mapping (post-mitigation):** interpret \`fields.residual.*\` into \`postProbability\`, \`postCostMin\` / \`postCostMostLikely\` / \`postCostMax\`, \`postTimeMin\` / \`postTimeMostLikely\` / \`postTimeMax\` **only when** residual figures are present in this JSON or clearly in the transcript. If residual impact was **not** captured, **omit all post\*** keys (do not guess revised values).
- **Mitigation:** set output \`mitigation\` from \`fields.mitigation.description\` when present; otherwise derive only from the transcript.
- **Mitigation in place:** use \`fields.mitigation.inPlace\` as context — \`true\` = controls already active (residual should reflect current remaining exposure); \`false\` = not yet implemented (do not confuse with \`mitigationCost\`, which is spend to implement a plan). Do not invent \`mitigationCost\` unless the transcript or structured context states a spend.
- **Category/owner:** you may take hints from \`fields.category\` / \`fields.owner\` when consistent with the category list rules elsewhere in this prompt.`;
}

function buildGuidedImpactSection(guided: GuidedExtractImpact | undefined): string {
  if (guided?.impactClear === false) {
    return `## Guided impact mode (STRICT — overrides conflicting instructions below)
The accompanying risk-chat flow did **not** firmly establish whether this risk affects cost, time, or both (impact remained unclear).

**Follow these even where other sections ask you to infer or fill pre-mitigation fields:**
- Do **not** invent dollar amounts, day counts, or cost/time **bands** from vague language (severity, concern, "material", "major", priority) or from the fact that a risk exists.
- Use **0** for costMin, costMostLikely, costMax and for timeMin, timeMostLikely, timeMax unless the transcript states **explicit** numbers, currency, or calendar durations tied to this risk.
- Set appliesTo to "cost", "time", or "both" only according to explicit transcript evidence; if cost vs time was never distinguished, use "both" with **all** cost and time magnitudes at **0**.
- Probability may still reflect stated likelihood; do not use probability to justify fabricated cost or time values.`;
  }
  if (guided?.impactClear === true && guided.appliesTo) {
    const atJson =
      guided.appliesTo === "Cost"
        ? "cost"
        : guided.appliesTo === "Time"
          ? "time"
          : "both";
    return `## Guided impact mode (from risk chat)
The user confirmed impact type in dialogue (${guided.appliesTo}; JSON appliesTo "${atJson}").
- Prefer appliesTo "${atJson}" unless the transcript clearly contradicts it.
- Infer cost/time magnitudes only from explicit numbers, ranges, or units in the text; otherwise use 0 for dimensions not quantified.`;
  }
  return "";
}

const EXTRACT_SYSTEM_PREFIX = `You are an expert risk analyst for a decision intelligence platform. Your job is to turn free-text risk descriptions into a fully populated, structured risk record. You must EXTRACT explicit values and INFER missing values from context. Never leave fields blank when reasonable inference can be made.

## Critical rule
Prefer intelligent estimation over leaving blanks. We are building a decision intelligence platform — not a literal transcription tool. Populate ALL pre-mitigation fields wherever possible.

## 1. Cost ranges
- If text gives a range (e.g. "$750k to $1.5m", "$0.75m–$1.5m", "between 1m and 2m"):
  - costMin = lower bound (in dollars, e.g. 750000)
  - costMax = upper bound (e.g. 1500000)
  - costMostLikely = midpoint
- If only one cost value is given:
  - costMin = 0.7 × value
  - costMostLikely = value
  - costMax = 1.3 × value
- Interpret "k" as thousands, "m" as millions. No commas in numbers.

## 2. Time ranges
- Convert everything to DAYS: 1 week = 7 days, 1 month = 30 days.
- If text gives a range (e.g. "8–12 weeks", "2 to 3 months", "10–15 days"):
  - timeMin = lower bound (days)
  - timeMax = upper bound (days)
  - timeMostLikely = midpoint (integer)
- If only one duration is given:
  - timeMin = floor(0.75 × value)
  - timeMostLikely = value (integer)
  - timeMax = ceil(1.25 × value)
- If no time impact is mentioned and only cost applies, set timeMin, timeMostLikely, timeMax to 0.

## 3. Probability (0–100%)
- If explicitly stated as % or "1 in N", use it.
- If not stated, infer from contextual phrases:
  - High (60–75%): "likely", "increasingly concerned", "expected", "capacity is tight", "high probability"
  - Medium (35–55%): "possible", "risk that", "may impact", "could slip"
  - Low (15–30%): "unlikely", "contingent on", "remote"
- Set probability to the midpoint of the inferred band. Default to 50 if truly ambiguous.
`;

const EXTRACT_SYSTEM_SUFFIX = `## 5. Owner
Infer from category/keywords:
- Procurement keywords → "Procurement Manager"
- Design keywords → "Design Manager"
- Authority keywords → "Development Manager"
- Commercial keywords → "Commercial Manager"
- Else → "Project Director"

## 6. Applies To
- If both cost and time are detected (non-zero) → "both"
- If only cost (time all zeros) → "cost"
- If only time (cost all zeros) → "time"
- If neither, use "both" with probability only.

## 7. Title
- Short, specific, max 6 words.
- Describe the RISK only (the exposure or threat), not the mitigation or any action taken.
- Use key noun phrases for the risk itself (e.g. "33kV Switchgear Capacity Delay", "Supplier Delivery Slip").
- Do NOT include mitigation, outcomes, or "with mitigation" in the title.

## 8. Description
- Use the user's text, trimmed. If they only gave a short phrase, you may expand slightly for clarity but keep it concise.

## 9. Mitigation (structured reasoning)

**Critical distinction:**
- **mitigationCost** = the cost TO APPLY the mitigation (e.g. $250k to expedite, budget/spend). This is NOT the residual risk. Store in mitigationCost only.
- **Post-mitigation (residual) fields** = the REMAINING risk after mitigation: lower probability and REDUCED impact (cost/time). postCostMin/ML/Max and postTimeMin/ML/Max are the remaining exposure, never the cost of doing the mitigation.

### 9.1 Extract mitigation cost
If text includes: "at a cost of $250k", "for $250,000", "$250k acceleration", "deposit of 250k", "mitigation cost $1.2m":
- Set mitigationCost = that value in dollars (250000, 1200000). Normalize: $250k → 250000, $1.2m → 1200000.
- mitigationCost is the spend to implement the mitigation. Do NOT use it as postCost or postTime — those are the remaining risk impact.

### 9.2 Mitigation eliminates risk
If text says: "bring back to 0 weeks", "recover delay", "fully mitigate", "eliminate impact", "negate", "remove the risk":
- postProbability = 0
- postTimeMin = 0, postTimeMostLikely = 0, postTimeMax = 0
- postCostMin = 0, postCostMostLikely = 0, postCostMax = 0
- The residual risk is zero; mitigationCost (if any) is separate and only in mitigationCost.

### 9.3 Mitigation reduces but does not eliminate
If text says: "reduce impact", "partially mitigate", "may reduce delay", "soften the impact":
- postProbability = 50% of pre-mitigation probability (never higher)
- postTimeMin, postTimeMostLikely, postTimeMax = 50% of pre-mitigation time values (round to integers) — this is the remaining delay exposure
- postCostMin, postCostMostLikely, postCostMax = 50% of pre-mitigation cost values — this is the remaining cost exposure, NOT the mitigation spend

### 9.4 Post-mitigation probability rule
- If mitigation fully eliminates impact → postProbability = 0.
- If mitigation partially reduces → postProbability = reduced value (e.g. 50% of pre). Never increase probability in post-mitigation.

### 9.5 When no mitigation is described
- Omit mitigation, mitigationCost, and all post* fields; or set post* equal to pre* and mitigationCost to 0.

### 9.6 When mitigation is described
- Populate mitigation (description of the mitigation).
- Populate mitigationCost if any cost to implement mitigation is mentioned (this is spend, not residual risk).
- Populate postProbability, postCostMin, postCostMostLikely, postCostMax, postTimeMin, postTimeMostLikely, postTimeMax as the REMAINING risk after mitigation: lower probability and reduced impact. Never set post-cost or post-time to mitigationCost.

## Output format (JSON only, no markdown, no commentary)
Return a single JSON object. All numbers are numeric (no strings). No nulls: use 0 for cost/time when that impact type does not apply.

Required keys:
"title", "description" (optional), "category", "owner", "probability", "costMin", "costMostLikely", "costMax", "timeMin", "timeMostLikely", "timeMax", "appliesTo"

Optional (include when mitigation is detected):
"mitigation" (string – mitigation description),
"mitigationCost" (number, 0 if none),
"postProbability" (number 0–100, never > pre),
"postCostMin", "postCostMostLikely", "postCostMax",
"postTimeMin", "postTimeMostLikely", "postTimeMax"

Also allow: "contingency" (string or omit).

Example with full mitigation (residual = 0): { "title": "Supplier Delivery Slip", "probability": 60, "costMin": 500000, "costMostLikely": 750000, "costMax": 1000000, "timeMin": 28, "timeMostLikely": 42, "timeMax": 56, "appliesTo": "both", "mitigation": "Expedite with premium supplier", "mitigationCost": 250000, "postProbability": 0, "postCostMin": 0, "postCostMostLikely": 0, "postCostMax": 0, "postTimeMin": 0, "postTimeMostLikely": 0, "postTimeMax": 0 }
Example with partial mitigation (residual reduced): postProbability = 30, postCost/postTime = 50% of pre; mitigationCost = 250000 (separate).`;

function buildExtractSystem(
  categories: string[],
  guided?: GuidedExtractImpact,
  structuredConversationAppendix?: string,
): string {
  const guidedBlock = buildGuidedImpactSection(guided);
  const prefix = EXTRACT_SYSTEM_PREFIX.trimEnd();
  const glue = guidedBlock !== "" ? `\n\n${guidedBlock}\n\n` : "\n\n";
  const core = `${prefix}${glue}${buildExtractCategorySection(categories)}\n\n${EXTRACT_SYSTEM_SUFFIX.trimStart()}`;
  if (structuredConversationAppendix !== undefined && structuredConversationAppendix.trim() !== "") {
    return `${core}\n\n${structuredConversationAppendix}`;
  }
  return core;
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let rate: Awaited<ReturnType<typeof checkAiRateLimit>>;
  try {
    rate = await checkAiRateLimit({
      userId: auth.id,
      routeName: "extract-risk",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Rate limit check temporarily unavailable",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }

  if (!rate.success) {
    const resetSeconds = Math.ceil(rate.reset / 1000);
    const retryAfter = Math.max(0, resetSeconds - Math.ceil(Date.now() / 1000));

    return NextResponse.json(
      buildRateLimit429Payload(rate),
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
          "X-RateLimit-Reset": String(resetSeconds),
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const documentText = typeof body?.documentText === "string" ? body.documentText : "";
    const rawCategories = body?.categories;
    const categories = Array.isArray(rawCategories)
      ? rawCategories
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      : [];
    const rawProjectId = body?.projectId;
    const projectIdForUsage =
      typeof rawProjectId === "string" && rawProjectId.trim().length > 0 ? rawProjectId.trim() : null;

    const rawGuidedClear = body?.guidedImpactClear;
    const guidedImpactClearLegacy =
      typeof rawGuidedClear === "boolean" ? rawGuidedClear : undefined;
    const rawGuidedApplies = body?.guidedAppliesTo;
    const guidedAppliesToLegacy =
      rawGuidedApplies === "Cost" || rawGuidedApplies === "Time" || rawGuidedApplies === "Cost & Time"
        ? rawGuidedApplies
        : undefined;

    const conversationStateParsed = parseConversationState(body?.conversationState);
    const structuredAppendix =
      conversationStateParsed !== null
        ? buildStructuredConversationStateAppendix(conversationStateParsed)
        : undefined;

    let guidedExtract: GuidedExtractImpact | undefined;
    if (conversationStateParsed !== null) {
      guidedExtract = {
        impactClear: conversationStateParsed.sufficiency.inherentClear,
        appliesTo: conversationStateParsed.fields.impact.appliesTo,
      };
    } else if (guidedImpactClearLegacy !== undefined || guidedAppliesToLegacy !== undefined) {
      guidedExtract = { impactClear: guidedImpactClearLegacy, appliesTo: guidedAppliesToLegacy };
    } else {
      guidedExtract = undefined;
    }

    if (!documentText.trim()) {
      return NextResponse.json({ error: "documentText is required" }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      fetch: globalThis.fetch,
      timeout: 60_000,
    });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildExtractSystem(categories, guidedExtract, structuredAppendix),
        },
        { role: "user", content: documentText },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
      return NextResponse.json(
        { error: "Model returned empty response", rawPreview: rawText.slice(0, 800) },
        { status: 500 }
      );
    }

    let parsedJson: unknown;
    try {
      const toParse = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      parsedJson = JSON.parse(toParse);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", rawPreview: rawText.slice(0, 800) },
        { status: 500 }
      );
    }

    const result = IntelligentExtractDraftSchema.safeParse(parsedJson);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid extraction schema",
          issues: result.error.issues,
          rawPreview: rawText.slice(0, 800),
        },
        { status: 400 }
      );
    }

    const userIdForUsage = auth.id;
    const promptTokens = completion.usage?.prompt_tokens;
    const completionTokens = completion.usage?.completion_tokens;
    void (async () => {
      try {
        const supabase = await supabaseServerClient();
        const { error } = await supabase.from("visualify_ai_usage").insert({
          product_key: "riskai",
          project_id: projectIdForUsage,
          user_id: userIdForUsage,
          feature: "extract-risk",
          model: completion.model,
          tokens_input: promptTokens ?? null,
          tokens_output: completionTokens ?? null,
          cost_usd: estimateOpenAiChatCostUsd(completion.model, promptTokens, completionTokens),
        });
        if (error) {
          console.error(USAGE_LOG_PREFIX, "insert failed:", error.message, error);
        }
      } catch (e: unknown) {
        console.error(
          USAGE_LOG_PREFIX,
          "insert threw:",
          e instanceof Error ? e.message : String(e)
        );
      }
    })();

    return NextResponse.json({ risk: result.data });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Internal error in /api/ai/extract-risk",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
