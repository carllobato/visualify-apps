import {
  PROJECT_CURRENCY_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
  type ProjectContext,
  type ProjectCurrency,
  type RiskAppetite,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";
import {
  getProjectInformationValidationErrors,
  type RawNumericFields,
} from "@/lib/project/projectInformationFormValidation";

/**
 * Canonical `visualify_projects.project_*` columns that define Project completeness.
 * `project_code` is optional and is not required here.
 */
export const CANONICAL_PROJECT_COMPLETENESS_SELECT =
  "project_name, project_location, project_industry, project_stage, project_currency, project_value, project_contingency, project_delay_cost_per_working_day, project_planned_duration_months, project_target_completion_date, project_working_days_per_week, project_schedule_contingency_working_days, project_risk_appetite";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function presentText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Match Project Information date hydration: ISO date prefix, else a parseable date. */
function targetCompletionDateFromCanonical(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1] ?? "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

/**
 * Numeric 0 is present. Null, empty, and non-finite values are missing.
 * Same presence rule as Project Information canonical hydration.
 */
function finiteNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

function emptyRawNumeric(): RawNumericFields {
  return {
    projectValue_input: "",
    contingencyValue_input: "",
    plannedDuration_months: "",
    scheduleContingency_workingDays: "",
    delay_cost_per_working_day: "",
  };
}

/**
 * Map canonical `visualify_projects` columns only. Does not read settings or localStorage.
 * Missing numerics stay empty in `raw` so a stored 0 is distinct from an absent value.
 */
export function canonicalProjectCompletenessInput(
  canonicalProjectRow: Record<string, unknown> | null | undefined,
): { form: ProjectContext; raw: RawNumericFields } {
  const row = asRecord(canonicalProjectRow) ?? {};
  const projectValue = finiteNonNegativeNumber(row.project_value);
  const contingency = finiteNonNegativeNumber(row.project_contingency);
  const delay = finiteNonNegativeNumber(row.project_delay_cost_per_working_day);
  const duration = finiteNonNegativeNumber(row.project_planned_duration_months);
  const scheduleContingency = finiteNonNegativeNumber(row.project_schedule_contingency_working_days);
  const workingDays = finiteNonNegativeNumber(row.project_working_days_per_week);

  const form: ProjectContext = {
    projectName: presentText(row.project_name),
    projectCode: presentText(row.project_code),
    location: presentText(row.project_location),
    projectIndustry: presentText(row.project_industry),
    projectStage: presentText(row.project_stage),
    plannedDuration_months: duration ?? 0,
    targetCompletionDate: targetCompletionDateFromCanonical(row.project_target_completion_date),
    scheduleContingency_weeks: 0,
    workingDaysPerWeek: (workingDays ?? 0) as WorkingDaysPerWeek,
    scheduleContingency_workingDays: scheduleContingency ?? 0,
    scheduleInputsVersion: 2,
    riskAppetite: presentText(row.project_risk_appetite) as RiskAppetite,
    currency: presentText(row.project_currency) as ProjectCurrency,
    financialUnit: "MILLIONS",
    financialInputsVersion: 2,
    projectValue_input: projectValue ?? 0,
    contingencyValue_input: contingency ?? 0,
    projectValue_m: 0,
    contingencyValue_m: 0,
    approvedBudget_m: 0,
    delay_cost_per_day: delay,
    delay_cost_per_working_day: delay,
  };

  const raw: RawNumericFields = {
    projectValue_input: projectValue == null ? "" : String(projectValue),
    contingencyValue_input: contingency == null ? "" : String(contingency),
    plannedDuration_months: duration == null ? "" : String(duration),
    scheduleContingency_workingDays: scheduleContingency == null ? "" : String(scheduleContingency),
    delay_cost_per_working_day: delay == null ? "" : String(delay),
  };

  return { form, raw };
}

const PROJECT_INFORMATION_UNSET_CURRENCY: ProjectCurrency = "AUD";
const PROJECT_INFORMATION_UNSET_RISK_APPETITE: RiskAppetite = "P80";
const PROJECT_INFORMATION_UNSET_WORKING_DAYS: WorkingDaysPerWeek = 5;

/**
 * Project Information hydration from canonical `visualify_projects` only.
 * Settings rows and localStorage must not be passed in.
 * Missing numerics stay empty; currency / risk appetite / working days use
 * the agreed unset UI defaults when the canonical value is absent.
 */
export function hydrateProjectInformationFromCanonicalRow(
  canonicalProject: Record<string, unknown> | null | undefined,
): { form: ProjectContext; raw: RawNumericFields } {
  const { form, raw } = canonicalProjectCompletenessInput(canonicalProject);
  const workingDaysPerWeek = (WORKING_DAYS_PER_WEEK_VALUES as readonly number[]).includes(
    form.workingDaysPerWeek,
  )
    ? form.workingDaysPerWeek
    : PROJECT_INFORMATION_UNSET_WORKING_DAYS;
  const currency = (PROJECT_CURRENCY_VALUES as readonly string[]).includes(form.currency)
    ? form.currency
    : PROJECT_INFORMATION_UNSET_CURRENCY;
  const riskAppetite = (RISK_APPETITE_VALUES as readonly string[]).includes(form.riskAppetite)
    ? form.riskAppetite
    : PROJECT_INFORMATION_UNSET_RISK_APPETITE;

  return {
    form: {
      ...form,
      workingDaysPerWeek,
      currency,
      riskAppetite,
      financialUnit: "MILLIONS",
      financialInputsVersion: 2,
      scheduleInputsVersion: 2,
      projectValue_m: form.projectValue_input / 1e6,
      contingencyValue_m: form.contingencyValue_input / 1e6,
      approvedBudget_m: (form.projectValue_input + form.contingencyValue_input) / 1e6,
      scheduleContingency_weeks:
        workingDaysPerWeek > 0 ? form.scheduleContingency_workingDays / workingDaysPerWeek : 0,
    },
    raw,
  };
}

/** Field errors using Project Information / onboarding allowed-value rules. */
export function canonicalProjectCompletenessErrors(
  canonicalProjectRow: Record<string, unknown> | null | undefined,
): Record<string, string> {
  if (asRecord(canonicalProjectRow) == null) {
    return getProjectInformationValidationErrors(
      canonicalProjectCompletenessInput({}).form,
      emptyRawNumeric(),
    );
  }
  const { form, raw } = canonicalProjectCompletenessInput(canonicalProjectRow);
  return getProjectInformationValidationErrors(form, raw);
}

/**
 * True only when canonical `visualify_projects.project_*` required fields are valid.
 * Settings rows and localStorage must not be passed in and cannot make a Project complete.
 */
export function isCanonicalProjectComplete(
  canonicalProjectRow: Record<string, unknown> | null | undefined,
): boolean {
  return Object.keys(canonicalProjectCompletenessErrors(canonicalProjectRow)).length === 0;
}
