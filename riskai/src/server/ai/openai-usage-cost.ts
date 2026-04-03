/**
 * Estimates USD cost from Chat Completions usage.token counts.
 * Prices: OpenAI standard tier, per 1M tokens — see https://platform.openai.com/docs/pricing (gpt-4o-mini).
 * Update constants when OpenAI changes published rates.
 */
const GPT_4O_MINI_USD_PER_1M = {
  input: 0.15,
  output: 0.6,
} as const;

function pricingForModel(model: string): { inputPer1M: number; outputPer1M: number } | null {
  if (model === "gpt-4o-mini" || model.startsWith("gpt-4o-mini-")) {
    return {
      inputPer1M: GPT_4O_MINI_USD_PER_1M.input,
      outputPer1M: GPT_4O_MINI_USD_PER_1M.output,
    };
  }
  return null;
}

/**
 * cost_usd = (prompt_tokens / 1e6) * inputPer1M + (completion_tokens / 1e6) * outputPer1M
 * Returns null if either token count is missing/non-finite or the model is not in the price map.
 */
export function estimateOpenAiChatCostUsd(
  model: string,
  promptTokens: number | null | undefined,
  completionTokens: number | null | undefined
): number | null {
  if (promptTokens == null || completionTokens == null) return null;
  if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) return null;
  if (promptTokens < 0 || completionTokens < 0) return null;

  const rates = pricingForModel(model);
  if (!rates) return null;

  const inputCost = (promptTokens / 1_000_000) * rates.inputPer1M;
  const outputCost = (completionTokens / 1_000_000) * rates.outputPer1M;
  return inputCost + outputCost;
}
