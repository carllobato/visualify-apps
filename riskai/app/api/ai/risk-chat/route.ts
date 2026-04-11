export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { deriveGuidedRiskConversationState } from "@/lib/ai/deriveGuidedRiskConversationState";
import type { GuidedRiskConversationState } from "@/lib/ai/guidedRiskConversationState";
import { requireUser } from "@/lib/auth/requireUser";
import { checkAiRateLimit, buildRateLimit429Payload } from "@/server/ai/rate-limit";
import { env } from "@/lib/env";

const CHAT_SYSTEM_BASE = `You are a concise, professional assistant helping a project manager define a single risk for a decision-intelligence risk register.

Goals:
- Ask short follow-up questions only when needed (category, impact, cost/time, mitigation, owner).
- Reflect back what you understood so the user can confirm or correct.
- Do not output JSON or structured risk fields in the chat; stay conversational.
- When the user has described enough to form a risk, say you are ready for them to click "Create risk from conversation" in the UI (do not invent button text they cannot see).`;

function buildRiskChatSystem(structuredStateJson: string): string {
  return `${CHAT_SYSTEM_BASE}

## STRUCTURED STATE (source of truth)
The following JSON is the authoritative structured representation of what is already known about this risk from the conversation. Use it as the source of truth for turn progression — not keyword heuristics.

${structuredStateJson}

Instructions:
- Treat STRUCTURED STATE as the source of truth for what is already known.
- Do not re-ask for any aspect that is already sufficient according to sufficiency.* unless the user has clearly contradicted it in their latest message.
- If sufficiency.readyToCreate is true, do not ask another question; briefly confirm readiness and remind them they can use "Create risk from conversation" in the UI (do not invent other button text).
- Otherwise ask exactly one concise follow-up question targeting the highest-priority gap (see nextQuestionFocus / missingFields if present).
- Do not output JSON or raw structured fields in your reply; stay conversational.

Keep replies under ~120 words unless the user asks for detail.`;
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
      appliesTo: state.fields.impact.appliesTo ?? null,
      mitigationExists: state.fields.mitigation.exists,
      mitigationStatus: state.fields.mitigation.status ?? null,
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

    const systemContent = buildRiskChatSystem(structuredStateJson);

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
