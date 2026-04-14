import { loadProjectContext, parseProjectContextFromVisualifyProjectSettingsRow } from "@/lib/projectContext";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Delay rate for Monte Carlo: prefer project-scoped localStorage (fast), else authoritative DB row.
 * Ensures simulations include delay-derived cost when the user never opened project settings in this browser.
 */
export async function resolveDelayCostPerDayForSimulation(
  projectId: string | undefined
): Promise<number | undefined> {
  if (!projectId || typeof projectId !== "string") return undefined;
  const pid = projectId.trim();
  if (!pid) return undefined;

  const delayCtx = loadProjectContext(pid);
  const fromLocal =
    delayCtx?.delay_cost_per_day != null &&
    Number.isFinite(delayCtx.delay_cost_per_day) &&
    delayCtx.delay_cost_per_day > 0
      ? delayCtx.delay_cost_per_day
      : undefined;
  if (fromLocal !== undefined) return fromLocal;

  try {
    const supabase = supabaseBrowserClient();
    const { data: row, error } = await supabase
      .from("visualify_project_settings")
      .select("*")
      .eq("project_id", pid)
      .maybeSingle();
    if (error || row == null || typeof row !== "object") return undefined;
    const parsed = parseProjectContextFromVisualifyProjectSettingsRow(row as Record<string, unknown>);
    const d = parsed?.delay_cost_per_day;
    if (d != null && Number.isFinite(d) && d > 0) return d;
  } catch {
    // Supabase or network unavailable
  }
  return undefined;
}
