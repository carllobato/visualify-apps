import {
  loadProjectContext,
  parseProjectContextFromVisualifyProjectSettingsRow,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export type SimulationScheduleSettings = {
  delayCostPerWorkingDay?: number;
  workingDaysPerWeek: WorkingDaysPerWeek;
};

const DEFAULT_WORKING_DAYS_PER_WEEK: WorkingDaysPerWeek = 5;

function positiveFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/**
 * Schedule settings for Monte Carlo: prefer `visualify_project_settings` from Supabase,
 * else project-scoped localStorage. Delay cost is interpreted per working day.
 */
export async function resolveScheduleSettingsForSimulation(
  projectId: string | undefined
): Promise<SimulationScheduleSettings> {
  if (!projectId || typeof projectId !== "string") {
    return { workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK };
  }
  const pid = projectId.trim();
  if (!pid) return { workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK };

  let workingDaysPerWeek = DEFAULT_WORKING_DAYS_PER_WEEK;
  let hasDbWorkingDaysPerWeek = false;

  try {
    const supabase = supabaseBrowserClient();
    const { data: row, error } = await supabase
      .from("visualify_project_settings")
      .select("*")
      .eq("project_id", pid)
      .maybeSingle();
    if (!error && row != null && typeof row === "object") {
      const parsed = parseProjectContextFromVisualifyProjectSettingsRow(row as Record<string, unknown>);
      if (parsed) {
        workingDaysPerWeek = parsed.workingDaysPerWeek;
        hasDbWorkingDaysPerWeek = true;
        const delayCostPerWorkingDay = positiveFiniteNumber(parsed.delay_cost_per_working_day);
        if (delayCostPerWorkingDay !== undefined) {
          return { delayCostPerWorkingDay, workingDaysPerWeek };
        }
      }
    }
  } catch {
    // Supabase or network unavailable
  }

  const delayCtx = loadProjectContext(pid);
  if (delayCtx) {
    return {
      delayCostPerWorkingDay:
        positiveFiniteNumber(delayCtx.delay_cost_per_working_day) ??
        positiveFiniteNumber(delayCtx.delay_cost_per_day),
      workingDaysPerWeek: hasDbWorkingDaysPerWeek
        ? workingDaysPerWeek
        : delayCtx.workingDaysPerWeek,
    };
  }

  return { workingDaysPerWeek };
}

/**
 * @deprecated Use resolveScheduleSettingsForSimulation so callers also receive working-days metadata.
 */
export async function resolveDelayCostPerDayForSimulation(
  projectId: string | undefined
): Promise<number | undefined> {
  const settings = await resolveScheduleSettingsForSimulation(projectId);
  return settings.delayCostPerWorkingDay;
}
