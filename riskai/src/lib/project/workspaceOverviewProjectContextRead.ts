import {
  PROJECT_CURRENCY_VALUES,
  type ProjectCurrency,
} from "@/lib/projectContext";

/**
 * Canonical `visualify_projects` columns consumed by Workspace Overview tiles,
 * reporting-position, contingency aggregation, and currency grouping.
 */
export const WORKSPACE_OVERVIEW_CANONICAL_PROJECT_SELECT =
  "id, project_currency, project_value, project_contingency, project_working_days_per_week, project_schedule_contingency_working_days, project_risk_appetite";

export type WorkspaceOverviewContingencyFields = {
  contingencyMillions: number;
  currency: ProjectCurrency;
  scheduleContingencyWorkingDays: number | null;
};

function asRow(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function presentNonNegativeNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function presentCanonicalCurrency(value: unknown): ProjectCurrency | null {
  return typeof value === "string" && (PROJECT_CURRENCY_VALUES as readonly string[]).includes(value)
    ? (value as ProjectCurrency)
    : null;
}

export function indexRowsByStringId(
  rows: readonly unknown[] | null | undefined,
  idKey: "id" | "project_id",
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const raw of rows ?? []) {
    const row = asRow(raw);
    if (!row) continue;
    const id = typeof row[idKey] === "string" ? row[idKey] : "";
    if (id) map.set(id, row);
  }
  return map;
}

/**
 * Workspace Overview financial/schedule/currency parameters from canonical
 * `visualify_projects.project_*` only.
 *
 * Canonical numeric 0 is present data. Canonical financial values are unscaled
 * major-currency amounts. Canonical schedule contingency is already working days.
 * Missing canonical values keep existing incomplete defaults (0 / AUD / null).
 */
export function resolveWorkspaceOverviewContingencyFields(
  canonicalProjectRow?: Record<string, unknown> | null,
): WorkspaceOverviewContingencyFields {
  const canonical = asRow(canonicalProjectRow);

  const canonicalContingency = presentNonNegativeNumber(canonical?.project_contingency);
  const contingencyMillions = canonicalContingency != null ? canonicalContingency / 1e6 : 0;

  const currency = presentCanonicalCurrency(canonical?.project_currency) ?? "AUD";

  const scheduleContingencyWorkingDays = presentNonNegativeNumber(
    canonical?.project_schedule_contingency_working_days,
  );

  return { contingencyMillions, currency, scheduleContingencyWorkingDays };
}

/**
 * Currency for Workspace Overview exposure/opportunity labels from canonical
 * `project_currency`, then existing AUD default.
 */
export function resolveWorkspaceOverviewProjectCurrency(
  canonicalProjectRow?: Record<string, unknown> | null,
): ProjectCurrency {
  const canonicalCurrency = presentCanonicalCurrency(asRow(canonicalProjectRow)?.project_currency);
  return canonicalCurrency ?? "AUD";
}

/**
 * Sum contingency held per currency using canonical Project parameters only.
 *
 * Includes rows whose `project_contingency` is genuinely present (including 0).
 * Does not invent a total for incomplete Projects with missing canonical values.
 */
export function sumWorkspaceOverviewContingencyByCurrency(
  canonicalRows: readonly Record<string, unknown>[],
): Map<ProjectCurrency, number> {
  const map = new Map<ProjectCurrency, number>();
  for (const row of canonicalRows) {
    if (presentNonNegativeNumber(row.project_contingency) == null) continue;
    const fields = resolveWorkspaceOverviewContingencyFields(row);
    map.set(fields.currency, (map.get(fields.currency) ?? 0) + fields.contingencyMillions);
  }
  return map;
}
