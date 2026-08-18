import "server-only";

/**
 * Legacy Portfolio-based demo clone (`visualify_portfolios` / `portfolio_id` /
 * `is_demo_template`) is disabled. Callers may still invoke this after auth.
 */
export async function ensureRiskAiDemoWorkspaceSeeded(
  userId: string,
  email?: string | null,
): Promise<void> {
  void email;
  if (!userId.trim()) return;
}
