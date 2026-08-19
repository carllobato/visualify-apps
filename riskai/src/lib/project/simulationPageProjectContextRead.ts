import {
  parseProjectContextFromCanonicalVisualifyProjectsRow,
  type ProjectContext,
} from "@/lib/projectContext";

/** Canonical `visualify_projects` columns required by the ProjectContext parser. */
export const SIMULATION_PAGE_CANONICAL_PROJECT_CONTEXT_SELECT =
  "project_name, project_location, project_currency, project_value, project_contingency, project_delay_cost_per_working_day, project_planned_duration_months, project_target_completion_date, project_working_days_per_week, project_schedule_contingency_working_days, project_risk_appetite";

function asRow(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/**
 * Simulation PAGE Project Context (display/gate only) for gated project-scoped
 * use: canonical `visualify_projects.project_*` only.
 *
 * Does not feed the Monte Carlo engine. Engine schedule/delay-cost resolution is
 * `resolveScheduleSettingsForSimulation` (canonical `visualify_projects` only).
 *
 * `settingsRow` and `localStorageContext` are ignored. Incomplete canonical
 * Projects are handled by the S4.5D route gate, not settings/localStorage.
 * Legacy/non-project flows load localStorage outside this helper.
 */
export function resolveSimulationPageProjectContext(args: {
  settingsRow?: Record<string, unknown> | null;
  canonicalProjectRow?: Record<string, unknown> | null;
  localStorageContext?: ProjectContext | null;
}): ProjectContext | null {
  return parseProjectContextFromCanonicalVisualifyProjectsRow(asRow(args.canonicalProjectRow));
}
