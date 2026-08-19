import {
  WORKING_DAYS_PER_WEEK_VALUES,
  type ProjectContext,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

export type SimulationScheduleSettings = {
  delayCostPerWorkingDay?: number;
  workingDaysPerWeek: WorkingDaysPerWeek;
  scheduleContingencyWorkingDays?: number;
};

/** Canonical `visualify_projects` columns consumed by the Monte Carlo Project-parameter resolver. */
export const SIMULATION_ENGINE_CANONICAL_PROJECT_SELECT =
  "project_delay_cost_per_working_day, project_working_days_per_week, project_schedule_contingency_working_days";

const DEFAULT_WORKING_DAYS_PER_WEEK: WorkingDaysPerWeek = 5;

function asRow(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Genuine present numeric data, including canonical 0. Does not use truthiness. */
function nonNegativeFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (t !== "") {
      const n = Number(t);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

function allowedCanonicalWorkingDaysPerWeek(value: unknown): WorkingDaysPerWeek | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return (WORKING_DAYS_PER_WEEK_VALUES as readonly number[]).includes(n)
    ? (n as WorkingDaysPerWeek)
    : null;
}

function simulationSettingsFromResolved(args: {
  delayCostPerWorkingDay: number | undefined;
  workingDaysPerWeek: WorkingDaysPerWeek;
  scheduleContingencyWorkingDays: number | undefined;
}): SimulationScheduleSettings {
  const { delayCostPerWorkingDay, workingDaysPerWeek, scheduleContingencyWorkingDays } = args;
  if (delayCostPerWorkingDay !== undefined) {
    return { delayCostPerWorkingDay, workingDaysPerWeek, scheduleContingencyWorkingDays };
  }
  return { workingDaysPerWeek, scheduleContingencyWorkingDays };
}

/**
 * Pure Monte Carlo Project-parameter resolver for gated project runs: canonical
 * `visualify_projects` fields only.
 *
 * Canonical delay cost is raw major currency (never scaled). Canonical schedule
 * contingency is already working days (never converted from weeks). Canonical
 * numeric 0 is present data.
 *
 * `settingsRow` and `localStorageContext` are ignored. Incomplete canonical
 * Projects are handled by the S4.5D route gate, not settings/localStorage.
 */
export function resolveSimulationEngineScheduleSettings(args: {
  settingsRow?: Record<string, unknown> | null;
  canonicalProjectRow?: Record<string, unknown> | null;
  localStorageContext?: ProjectContext | null;
}): SimulationScheduleSettings {
  const canonical = asRow(args.canonicalProjectRow);

  const canonicalDelay = nonNegativeFiniteNumber(
    canonical?.project_delay_cost_per_working_day,
  );
  const canonicalWorkingDaysPerWeek = allowedCanonicalWorkingDaysPerWeek(
    canonical?.project_working_days_per_week,
  );
  const canonicalScheduleContingencyWorkingDays = nonNegativeFiniteNumber(
    canonical?.project_schedule_contingency_working_days,
  );
  const hasCanonicalEngineField =
    canonicalDelay != null ||
    canonicalWorkingDaysPerWeek != null ||
    canonicalScheduleContingencyWorkingDays != null;

  if (!hasCanonicalEngineField) {
    return { workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK };
  }

  return simulationSettingsFromResolved({
    delayCostPerWorkingDay: canonicalDelay ?? undefined,
    workingDaysPerWeek: canonicalWorkingDaysPerWeek ?? DEFAULT_WORKING_DAYS_PER_WEEK,
    scheduleContingencyWorkingDays: canonicalScheduleContingencyWorkingDays ?? undefined,
  });
}

/**
 * Schedule settings for Monte Carlo: canonical `visualify_projects` columns only
 * for gated project runs. Delay cost is interpreted per working day.
 */
export async function resolveScheduleSettingsForSimulation(
  projectId: string | undefined
): Promise<SimulationScheduleSettings> {
  if (!projectId || typeof projectId !== "string") {
    return { workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK };
  }
  const pid = projectId.trim();
  if (!pid) return { workingDaysPerWeek: DEFAULT_WORKING_DAYS_PER_WEEK };

  let canonicalProjectRow: Record<string, unknown> | null = null;

  try {
    const supabase = supabaseBrowserClient();
    const projectResult = await supabase
      .from("visualify_projects")
      .select(SIMULATION_ENGINE_CANONICAL_PROJECT_SELECT)
      .eq("id", pid)
      .maybeSingle();
    if (!projectResult.error && projectResult.data != null && typeof projectResult.data === "object") {
      canonicalProjectRow = projectResult.data as Record<string, unknown>;
    }
  } catch {
    // Supabase or network unavailable
  }

  return resolveSimulationEngineScheduleSettings({
    canonicalProjectRow,
  });
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
