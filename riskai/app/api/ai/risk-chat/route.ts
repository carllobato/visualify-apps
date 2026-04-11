export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { deriveGuidedRiskConversationState } from "@/lib/ai/deriveGuidedRiskConversationState";
import type { GuidedRiskConversationState } from "@/lib/ai/guidedRiskConversationState";
import { requireUser } from "@/lib/auth/requireUser";
import { checkAiRateLimit, buildRateLimit429Payload } from "@/server/ai/rate-limit";
import { env } from "@/lib/env";

const CHAT_SYSTEM_BASE = `You are a concise, professional assistant with the tone of a commercial risk manager: operational and direct, not explanatory or lecture-style. Help a project manager define **one** risk for a decision-intelligence risk register.

Follow a **strict sequence** (one topic per turn where possible). Do not skip ahead while an earlier stage is still insufficient per STRUCTURED STATE.

## SEQUENCE (mandatory order)
1. **Risk** — What could go wrong (the risk event/issue). Do not ask for P/T/C until sufficiency.riskClear is true.
2. **Inherent P/T/C** — Pre-mitigation **probability**, **cost impact**, and **time impact** (each may be qualitative but must be concrete enough to record). Do not ask for mitigation until sufficiency.inherentClear is true.
3. **Mitigation strategy** — What would be done to address it (or explicit "none / TBD" captured as substance). Do not ask in-place until sufficiency.mitigationClear is true.
4. **Mitigation in place** — Whether that mitigation is **already implemented** (yes/no). Do not ask for residual until sufficiency.mitigationInPlaceClear is true.
5. **Residual / revised P/T/C** — Post-mitigation **probability**, **cost**, and **time** (revised exposure). Do not give the final summary until sufficiency.residualClear is true.
6. **Confirm** — Only when sufficiency.readyToCreate is true: short final summary + ask whether to create the risk.

## RESPONSE STYLE RULES
- Keep responses short and direct.
- Do NOT repeat or restate all prior information.
- Do NOT summarise the full risk unless the user explicitly asks, except when sufficiency.readyToCreate is true—then give only the compact ready-to-create block in BEHAVIOUR RULES (no other long summary).
- Use a maximum of 1–2 sentences before asking a question (except the ready-to-create turn).
- If the information provided is clear, acknowledge briefly and move **forward** to the next stage in the sequence.
- Avoid filler openers ("To summarize", "Great, so…", "In summary").

## BEHAVIOUR RULES
- When the user clearly provides what you need for the current stage: brief acknowledgement + **one** next question targeting the next gap in the sequence (see STRUCTURED STATE sufficiency.* and nextQuestionFocus).
- When sufficiency.readyToCreate is true: do not ask information-gathering questions; do not mention buttons, clicks, or other UI. Reply with a short final block using only STRUCTURED STATE for facts — use these labels **in order**, one line each:
  Risk: <one line>
  Inherent — P / Cost / Time: <one line combining fields.inherent.probability, .cost, .time>
  Mitigation: <one line from fields.mitigation.description; note if in place>
  Residual — P / Cost / Time: <one line combining fields.residual.probability, .cost, .time>
  Then end with a direct creation prompt such as: "Should I create this risk?"
  If fields.category is present in STRUCTURED STATE, you may add a single optional line "Category: …" after Risk; otherwise omit.
- Do not output JSON or structured risk fields in the chat; stay conversational.`;

function formatCategoryListInline(categories: string[]): string {
  return categories.join(", ");
}

function buildCategoryPromptSection(categories: string[]): string {
  const categoryRules = `## CATEGORY RULES
- You must only use the provided category list when you mention a category.
- Do NOT invent new categories.
- Do NOT suggest generic categories like operational, financial, reputational, etc.
- Category is **secondary** to the mandatory sequence: never let category questions interrupt steps 1–5. If category is still unknown after the risk is clear, you may ask once using the list below — or rely on STRUCTURED STATE if fields.category is already set.
- If the user's answer does not match a valid category, ask them to choose from the provided list again.
- Always present the categories exactly as provided.`;

  if (categories.length === 0) {
    return `## CATEGORY LIST
No categories were supplied for this request (empty list). Do not invent or imply any default or example categories.

${categoryRules}`;
  }

  const inlineList = formatCategoryListInline(categories);
  const listed = categories.map((c) => `- ${c}`).join("\n");
  const exactQuestion = `Which category best fits this risk: ${inlineList}?`;

  return `## CATEGORY INFERENCE
- When the user's wording clearly implies a single category from the list below, that value should appear in STRUCTURED STATE; you do not need to confirm unless ambiguous.
- Ask for category only when needed for the register and not already in STRUCTURED STATE — and not before the risk itself is clear.

## CATEGORY LIST
The only valid categories for this risk are exactly these strings (same order as the client supplied them):
${listed}

When you need to ask which category applies, use strictly this sentence (including the list), with no other category examples:
"${exactQuestion}"

${categoryRules}`;
}

function buildRiskChatSystem(structuredStateJson: string, categories: string[]): string {
  return `${CHAT_SYSTEM_BASE}

${buildCategoryPromptSection(categories)}

## STRUCTURED STATE (source of truth)
The following JSON is the authoritative structured representation of what is already known about this risk from the conversation. Use it as the source of truth for turn progression — not keyword heuristics.

${structuredStateJson}

Instructions:
- Treat STRUCTURED STATE as the source of truth for what is already known.
- Do not re-ask for any aspect that is already sufficient according to sufficiency.* unless the user has clearly contradicted it in their latest message.
- Follow the SEQUENCE in order. Use nextQuestionFocus and missingFields when present to pick the **single** highest-priority gap.
- If sufficiency.readyToCreate is true, follow BEHAVIOUR RULES for the ready-to-create reply (compact summary + creation prompt; no further information-gathering questions).
- Do not output JSON or raw structured fields in your reply; stay conversational.
- Do not restate captured fields in detail unless the user explicitly asks, except the labelled lines in the ready-to-create block when sufficiency.readyToCreate is true.`;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role === "user" || o.role === "assistant" ? o.role : null;
    const content = typeof o.content === "string" ? o.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content });
  }
  return out.slice(-40);
}

function normalizeCategories(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function truncateChars(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function logDerivedStateSnapshot(
  state: GuidedRiskConversationState,
  messageCount: number,
): void {
  const rs = truncateChars(state.summary.riskStatement, 200);
  console.log(
    "[risk-chat][derived-state]",
    JSON.stringify({
      riskStatement: rs ?? null,
      category: state.fields.category ?? null,
      owner: state.fields.owner ?? null,
      inherent: state.fields.inherent,
      residual: state.fields.residual,
      mitigationDescription: state.fields.mitigation.description ?? null,
      mitigationInPlace: state.fields.mitigation.inPlace ?? null,
      appliesTo: state.fields.impact.appliesTo ?? null,
      sufficiency: state.sufficiency,
      missingFields: state.missingFields,
      nextQuestionFocus: state.nextQuestionFocus ?? null,
      messageCount,
    }),
  );
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  let rate: Awaited<ReturnType<typeof checkAiRateLimit>>;
  try {
    rate = await checkAiRateLimit({
      userId: auth.id,
      routeName: "risk-chat",
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
    return NextResponse.json(buildRateLimit429Payload(rate), {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(rate.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(retryAfter),
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = normalizeMessages(body?.messages);
    const categories = normalizeCategories(body?.categories);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ error: "At least one user message is required" }, { status: 400 });
    }

    const conversationState = await deriveGuidedRiskConversationState({
      messages,
      categories,
    });

    logDerivedStateSnapshot(conversationState, messages.length);

    const structuredStateJson = JSON.stringify(conversationState);

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      fetch: globalThis.fetch,
      timeout: 60_000,
    });

    const systemContent = buildRiskChatSystem(structuredStateJson, categories);

    const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemContent },
      ...messages.map((m) =>
        m.role === "user"
          ? ({ role: "user" as const, content: m.content })
          : ({ role: "assistant" as const, content: m.content })
      ),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: apiMessages,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!reply) {
      return NextResponse.json({ error: "Model returned empty response" }, { status: 500 });
    }

    const readyToCreate = conversationState.sufficiency.readyToCreate;
    const needsFollowUp = !readyToCreate;

    console.log(
      "[risk-chat][decision]",
      JSON.stringify({
        readyToCreate,
        needsFollowUp,
        assistantPreview: truncateChars(reply, 120) ?? "",
      }),
    );

    return NextResponse.json({
      reply,
      assistantMessage: reply,
      readyToCreate,
      needsFollowUp,
      conversationState,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Internal error in /api/ai/risk-chat",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
