/**
 * Project context: baseline project attributes used to interpret risk outputs.
 * Persisted in localStorage under key PROJECT_CONTEXT_STORAGE_KEY.
 * Optional server sync via POST /api/project-context (see getProjectContext.ts).
 */

export const RISK_APPETITE_VALUES = [
  "P10",
  "P20",
  "P30",
  "P40",
  "P50",
  "P60",
  "P70",
  "P80",
  "P90",
  "P100",
] as const;

export type RiskAppetite = (typeof RISK_APPETITE_VALUES)[number];

/** Map settings Risk Appetite (e.g. P80) to cumulative percentile 0–100 for distribution targets. */
export function riskAppetiteToPercent(
  appetite: RiskAppetite | string | null | undefined
): number {
  if (appetite == null || typeof appetite !== "string") return 80;
  const n = parseInt(appetite.replace(/^P/i, ""), 10);
  return Number.isFinite(n) ? n : 80;
}

export const PROJECT_CURRENCY_VALUES = [
  "AUD",
  "USD",
  "GBP",
  "EUR",
  "NZD",
  "CAD",
  "SGD",
  "AED",
] as const;

export type ProjectCurrency = (typeof PROJECT_CURRENCY_VALUES)[number];

export type FinancialUnit = "THOUSANDS" | "MILLIONS" | "BILLIONS";

export const WORKING_DAYS_PER_WEEK_VALUES = [5, 5.5, 6, 6.5, 7] as const;

export type WorkingDaysPerWeek = (typeof WORKING_DAYS_PER_WEEK_VALUES)[number];

export const PROJECT_INDUSTRY_VALUES = [
  "Data Centres",
  "Commercial",
  "Residential",
  "Industrial & Logistics",
  "Infrastructure",
  "Energy & Utilities",
  "Healthcare",
  "Education",
  "Government & Public Sector",
  "Other",
] as const;

export type ProjectIndustry = (typeof PROJECT_INDUSTRY_VALUES)[number];

export const PROJECT_STAGE_VALUES = [
  "Due Diligence",
  "Feasibility",
  "Design & Planning",
  "Procurement",
  "Construction",
  "Commissioning",
  "Operations",
] as const;

export type ProjectStage = (typeof PROJECT_STAGE_VALUES)[number];

export type ScheduleInputsVersion = 1 | 2;

export function approxWorkingDaysFromMonths(
  months: number,
  workingDaysPerWeek: number | null | undefined = 5
): number {
  if (!Number.isFinite(months) || months <= 0) return 0;
  const wdpw = workingDaysPerWeekFromUnknown(workingDaysPerWeek);
  return months * ((wdpw * 52) / 12);
}

export type ProjectContext = {
  projectName: string;
  /** Optional free-text code. Empty is valid. */
  projectCode?: string;
  location?: string;
  /** Controlled industry; may hold a legacy/missing value until the user selects a valid option. */
  projectIndustry?: string;
  /** Controlled stage; may hold a legacy value such as Development / Delivery until the user selects a valid option. */
  projectStage?: string;
  plannedDuration_months: number;
  targetCompletionDate: string; // ISO date
  /** Legacy compatibility alias. New settings capture schedule contingency in working days. */
  scheduleContingency_weeks: number;
  workingDaysPerWeek: WorkingDaysPerWeek;
  scheduleContingency_workingDays: number;
  scheduleInputsVersion: ScheduleInputsVersion;
  riskAppetite: RiskAppetite;
  currency: ProjectCurrency;
  /** Kept for storage/API compatibility; inputs are always interpreted as whole-currency amounts in v2. */
  financialUnit: FinancialUnit;
  /**
   * Project value in major currency units (e.g. whole dollars: 217000000 not 217m).
   * Legacy v1 localStorage used scaled values with {@link financialUnit}.
   */
  projectValue_input: number;
  /**
   * Contingency in major currency units (same as {@link projectValue_input}).
   */
  contingencyValue_input: number;
  /** 1 = legacy scaled inputs; 2 = whole-currency amounts. Omitted treated as 1. */
  financialInputsVersion?: 1 | 2;
  /** Derived project value in $m for downstream use. */
  projectValue_m: number;
  /** Derived contingency value in $m. */
  contingencyValue_m: number;
  /** Derived approved budget in $m = projectValue_m + contingencyValue_m. */
  approvedBudget_m: number;
  /** Legacy compatibility alias. New simulation callers should use delay_cost_per_working_day. */
  delay_cost_per_day: number | null;
  /** Indirect cost rate in major currency units per working day (e.g. dollars/working day). */
  delay_cost_per_working_day: number | null;
};

const PROJECT_CONTEXT_STORAGE_KEY = "riskai_project_context_v1";

const FINANCIAL_UNIT_VALUES: FinancialUnit[] = ["THOUSANDS", "MILLIONS", "BILLIONS"];

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

function nonNegativeNumberFromUnknown(value: unknown): number | null {
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

function workingDaysPerWeekFromUnknown(value: unknown): WorkingDaysPerWeek {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN;
  return (WORKING_DAYS_PER_WEEK_VALUES as readonly number[]).includes(n)
    ? (n as WorkingDaysPerWeek)
    : 5;
}

function isIsoDateString(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

/**
 * Convert input in given unit to $m.
 * THOUSANDS: input is $k => value_m = input / 1000
 * MILLIONS: input is $m => value_m = input
 * BILLIONS: input is $b => value_m = input * 1000
 */
export function computeValueM(input: number, unit: FinancialUnit): number {
  if (!Number.isFinite(input) || input < 0) return 0;
  switch (unit) {
    case "THOUSANDS":
      return input / 1000;
    case "MILLIONS":
      return input;
    case "BILLIONS":
      return input * 1000;
    default:
      return input;
  }
}

/** @deprecated Use computeValueM. Kept for backward compatibility. */
export const computeProjectValueM = computeValueM;

/** Major-currency dollars (e.g. 217000000) from legacy scaled settings input + unit. */
export function majorCurrencyFromLegacyScaledInput(input: number, unit: FinancialUnit): number {
  return computeValueM(input, unit) * 1e6;
}

/** Map DB `target_completion_date` to `YYYY-MM-DD` for date inputs. */
function targetCompletionDateFromDb(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return "";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
}

function financialInputsVersionFromSettingsRow(row: Record<string, unknown>): 1 | 2 {
  return row.financial_inputs_version === 2 ? 2 : 1;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function presentNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function allowedCanonicalCurrency(value: unknown): ProjectCurrency | null {
  return typeof value === "string" && (PROJECT_CURRENCY_VALUES as readonly string[]).includes(value)
    ? (value as ProjectCurrency)
    : null;
}

function allowedCanonicalRiskAppetite(value: unknown): RiskAppetite | null {
  return typeof value === "string" && (RISK_APPETITE_VALUES as readonly string[]).includes(value)
    ? (value as RiskAppetite)
    : null;
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

const CANONICAL_PROJECT_CONTEXT_FIELD_KEYS = [
  "project_name",
  "project_location",
  "project_currency",
  "project_value",
  "project_contingency",
  "project_delay_cost_per_working_day",
  "project_planned_duration_months",
  "project_target_completion_date",
  "project_working_days_per_week",
  "project_schedule_contingency_working_days",
  "project_risk_appetite",
] as const;

/**
 * True when a `visualify_projects` row has at least one genuinely present canonical
 * Project Context field (numeric 0 counts; empty strings and nulls do not).
 */
export function visualifyProjectsRowHasCanonicalContextFields(
  row: Record<string, unknown> | null | undefined,
): boolean {
  if (row == null || typeof row !== "object") return false;
  return CANONICAL_PROJECT_CONTEXT_FIELD_KEYS.some((key) => {
    const value = row[key];
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") return value.trim().length > 0;
    return false;
  });
}

/**
 * Hydrate project context from canonical `visualify_projects.project_*` only.
 * Does not read `visualify_project_settings` or localStorage.
 *
 * Canonical financial columns are raw major-currency amounts (never scaled).
 * Canonical schedule contingency is already working days (never derived from weeks).
 * Canonical numeric 0 is present data.
 */
export function parseProjectContextFromCanonicalVisualifyProjectsRow(
  canonicalProject: Record<string, unknown> | null | undefined,
): ProjectContext | null {
  if (!visualifyProjectsRowHasCanonicalContextFields(canonicalProject)) return null;
  return parseProjectContextFromVisualifyProjectSettingsRow(null, canonicalProject);
}

/**
 * Hydrate project context from canonical `visualify_projects` fields first, then
 * `visualify_project_settings` where a canonical value is missing/null.
 *
 * Canonical financial columns are raw major-currency amounts (never scaled).
 * Canonical schedule contingency is already working days (never derived from weeks).
 * Settings-only callers keep the previous legacy interpretation, including v1 scaling.
 *
 * Gated Project application readers use
 * {@link parseProjectContextFromCanonicalVisualifyProjectsRow} instead.
 */
export function parseProjectContextFromVisualifyProjectSettingsRow(
  row: Record<string, unknown> | null | undefined,
  canonicalProject?: Record<string, unknown> | null,
): ProjectContext | null {
  const settings = asRecord(row);
  const canonical = asRecord(canonicalProject);

  const financialUnit =
    typeof settings.financial_unit === "string" &&
    FINANCIAL_UNIT_VALUES.includes(settings.financial_unit as FinancialUnit)
      ? (settings.financial_unit as FinancialUnit)
      : "MILLIONS";

  const inputsVersion = financialInputsVersionFromSettingsRow(settings);

  const pvScaled =
    typeof settings.project_value_input === "number" && Number.isFinite(settings.project_value_input)
      ? settings.project_value_input
      : 0;
  const cvScaled =
    typeof settings.contingency_value_input === "number" && Number.isFinite(settings.contingency_value_input)
      ? settings.contingency_value_input
      : 0;

  const canonicalWorkingDaysPerWeek = allowedCanonicalWorkingDaysPerWeek(
    canonical.project_working_days_per_week,
  );
  const workingDaysPerWeek =
    canonicalWorkingDaysPerWeek ?? workingDaysPerWeekFromUnknown(settings.working_days_per_week);

  const canonicalScheduleContingencyWorkingDays = nonNegativeNumberFromUnknown(
    canonical.project_schedule_contingency_working_days,
  );
  const rawScheduleContingencyWorkingDays =
    canonicalScheduleContingencyWorkingDays ??
    nonNegativeNumberFromUnknown(settings.schedule_contingency_working_days);
  const rawScheduleContingencyWeeks =
    canonicalScheduleContingencyWorkingDays != null
      ? null
      : nonNegativeNumberFromUnknown(settings.schedule_contingency_weeks);
  const scheduleInputsVersion: ScheduleInputsVersion =
    canonicalScheduleContingencyWorkingDays != null
      ? 2
      : settings.schedule_inputs_version === 2
        ? 2
        : 1;
  const scheduleContingencyWorkingDays =
    rawScheduleContingencyWorkingDays ??
    ((rawScheduleContingencyWeeks ?? 0) * workingDaysPerWeek);
  const scheduleContingencyWeeks =
    scheduleInputsVersion === 2 && rawScheduleContingencyWorkingDays != null
      ? (workingDaysPerWeek > 0 ? rawScheduleContingencyWorkingDays / workingDaysPerWeek : 0)
      : (rawScheduleContingencyWeeks ??
        (workingDaysPerWeek > 0 ? scheduleContingencyWorkingDays / workingDaysPerWeek : 0));

  const canonicalDelay = nonNegativeNumberFromUnknown(canonical.project_delay_cost_per_working_day);
  const delayWorkingScaled =
    nonNegativeNumberFromUnknown(settings.delay_cost_per_working_day) ??
    nonNegativeNumberFromUnknown(settings.delay_cost_per_day);

  const canonicalProjectValue = nonNegativeNumberFromUnknown(canonical.project_value);
  const canonicalContingency = nonNegativeNumberFromUnknown(canonical.project_contingency);

  const projectValueMajor =
    canonicalProjectValue != null
      ? canonicalProjectValue
      : inputsVersion === 2
        ? pvScaled
        : majorCurrencyFromLegacyScaledInput(pvScaled, financialUnit);
  const contingencyValueMajor =
    canonicalContingency != null
      ? canonicalContingency
      : inputsVersion === 2
        ? cvScaled
        : majorCurrencyFromLegacyScaledInput(cvScaled, financialUnit);
  const delayWorkingMajor =
    canonicalDelay != null
      ? canonicalDelay
      : delayWorkingScaled == null
        ? null
        : inputsVersion === 2
          ? delayWorkingScaled
          : majorCurrencyFromLegacyScaledInput(delayWorkingScaled, financialUnit);

  const canonicalName = presentNonEmptyString(canonical.project_name);
  const canonicalLocation = presentNonEmptyString(canonical.project_location);
  const canonicalDuration = nonNegativeNumberFromUnknown(canonical.project_planned_duration_months);
  const canonicalTargetDate = targetCompletionDateFromDb(canonical.project_target_completion_date);

  const raw = {
    projectName:
      canonicalName ?? (typeof settings.project_name === "string" ? settings.project_name : ""),
    location:
      canonicalLocation ??
      (settings.location !== undefined &&
      settings.location !== null &&
      typeof settings.location === "string"
        ? settings.location.trim()
        : undefined),
    plannedDuration_months: canonicalDuration ?? settings.planned_duration_months,
    targetCompletionDate:
      canonicalTargetDate !== ""
        ? canonicalTargetDate
        : targetCompletionDateFromDb(settings.target_completion_date),
    scheduleContingency_weeks: scheduleContingencyWeeks,
    workingDaysPerWeek,
    scheduleContingency_workingDays: scheduleContingencyWorkingDays,
    scheduleInputsVersion,
    riskAppetite: allowedCanonicalRiskAppetite(canonical.project_risk_appetite) ?? settings.risk_appetite,
    currency: allowedCanonicalCurrency(canonical.project_currency) ?? settings.currency,
    financialUnit: "MILLIONS" as FinancialUnit,
    financialInputsVersion: 2 as const,
    projectValue_input: projectValueMajor,
    contingencyValue_input: contingencyValueMajor,
    delay_cost_per_day: delayWorkingMajor,
    delay_cost_per_working_day: delayWorkingMajor,
  };
  return parseProjectContext(raw);
}

/** Validates raw object; returns validated ProjectContext or null. Handles legacy migration. */
export function parseProjectContext(raw: unknown): ProjectContext | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const projectName = typeof o.projectName === "string" ? o.projectName.trim() : "";
  const projectCode =
    o.projectCode !== undefined && o.projectCode !== null && typeof o.projectCode === "string"
      ? o.projectCode.trim()
      : undefined;
  const location =
    o.location !== undefined && o.location !== null && typeof o.location === "string"
      ? o.location.trim()
      : undefined;
  const projectIndustry =
    o.projectIndustry !== undefined && o.projectIndustry !== null && typeof o.projectIndustry === "string"
      ? o.projectIndustry.trim()
      : undefined;
  const projectStage =
    o.projectStage !== undefined && o.projectStage !== null && typeof o.projectStage === "string"
      ? o.projectStage.trim()
      : undefined;
  const plannedDuration_months = isNonNegativeInteger(o.plannedDuration_months) ? o.plannedDuration_months : 0;
  const targetCompletionDate =
    typeof o.targetCompletionDate === "string" && isIsoDateString(o.targetCompletionDate)
      ? o.targetCompletionDate
      : "";
  const scheduleInputsVersion: ScheduleInputsVersion = o.scheduleInputsVersion === 2 ? 2 : 1;
  const workingDaysPerWeek = workingDaysPerWeekFromUnknown(o.workingDaysPerWeek);
  const rawScheduleContingencyWorkingDays = nonNegativeNumberFromUnknown(o.scheduleContingency_workingDays);
  const rawScheduleContingencyWeeks = nonNegativeNumberFromUnknown(o.scheduleContingency_weeks);
  const scheduleContingency_workingDays =
    rawScheduleContingencyWorkingDays ??
    ((rawScheduleContingencyWeeks ?? 0) * workingDaysPerWeek);
  const scheduleContingency_weeks =
    scheduleInputsVersion === 2 && rawScheduleContingencyWorkingDays != null
      ? (workingDaysPerWeek > 0 ? rawScheduleContingencyWorkingDays / workingDaysPerWeek : 0)
      : (rawScheduleContingencyWeeks ??
        (workingDaysPerWeek > 0 ? scheduleContingency_workingDays / workingDaysPerWeek : 0));
  const riskAppetite =
    typeof o.riskAppetite === "string" &&
    (RISK_APPETITE_VALUES as readonly string[]).includes(o.riskAppetite)
      ? (o.riskAppetite as RiskAppetite)
      : "P80";
  const currency =
    typeof o.currency === "string" &&
    (PROJECT_CURRENCY_VALUES as readonly string[]).includes(o.currency)
      ? (o.currency as ProjectCurrency)
      : "AUD";

  const financialInputsVersion = o.financialInputsVersion === 2 ? 2 : 1;

  const legacyFinancialUnit =
    typeof o.financialUnit === "string" && FINANCIAL_UNIT_VALUES.includes(o.financialUnit as FinancialUnit)
      ? (o.financialUnit as FinancialUnit)
      : "MILLIONS";

  // Migration: prefer new fields; fall back to legacy baseCost_m / approvedContingency_m
  const hasLegacyBase = isNonNegativeNumber(o.baseCost_m);
  const hasLegacyContingency = isNonNegativeNumber(o.approvedContingency_m);
  const hasNewProjectValue = isNonNegativeNumber(o.projectValue_input);
  const hasNewContingencyValue = isNonNegativeNumber(o.contingencyValue_input);

  let pvScaled = 0;
  let cvScaled = 0;

  if (hasNewProjectValue) {
    pvScaled = o.projectValue_input as number;
  } else if (hasLegacyBase) {
    pvScaled = o.baseCost_m as number;
  }

  if (hasNewContingencyValue) {
    cvScaled = o.contingencyValue_input as number;
  } else if (hasLegacyContingency) {
    cvScaled = o.approvedContingency_m as number;
  }

  let projectValue_input: number;
  let contingencyValue_input: number;

  if (financialInputsVersion === 2) {
    projectValue_input = pvScaled;
    contingencyValue_input = cvScaled;
  } else {
    projectValue_input = majorCurrencyFromLegacyScaledInput(pvScaled, legacyFinancialUnit);
    contingencyValue_input = majorCurrencyFromLegacyScaledInput(cvScaled, legacyFinancialUnit);
  }

  const projectValue_m = projectValue_input / 1e6;
  const contingencyValue_m = contingencyValue_input / 1e6;
  const approvedBudget_m = projectValue_m + contingencyValue_m;

  let delay_cost_per_working_day: number | null = null;
  const rawDelay =
    nonNegativeNumberFromUnknown(o.delay_cost_per_working_day) ??
    nonNegativeNumberFromUnknown(o.delay_cost_per_day);
  if (rawDelay != null) {
    delay_cost_per_working_day =
      financialInputsVersion === 2
        ? rawDelay
        : majorCurrencyFromLegacyScaledInput(rawDelay, legacyFinancialUnit);
  }
  const delay_cost_per_day = delay_cost_per_working_day;

  return {
    projectName,
    projectCode,
    location,
    projectIndustry,
    projectStage,
    plannedDuration_months,
    targetCompletionDate,
    scheduleContingency_weeks,
    workingDaysPerWeek,
    scheduleContingency_workingDays,
    scheduleInputsVersion,
    riskAppetite,
    currency,
    financialUnit: "MILLIONS",
    financialInputsVersion: 2,
    projectValue_input,
    contingencyValue_input,
    projectValue_m,
    contingencyValue_m,
    approvedBudget_m,
    delay_cost_per_day,
    delay_cost_per_working_day,
  };
}

/** Whether the context has the minimum required fields filled for "complete" (required to proceed to Risk Register). */
export function isProjectContextComplete(ctx: ProjectContext | null): boolean {
  if (!ctx) return false;
  return (
    ctx.projectName.trim().length > 0 &&
    !!ctx.currency &&
    ctx.financialUnit != null &&
    ctx.projectValue_input > 0 &&
    ctx.contingencyValue_input >= 0 &&
    ctx.plannedDuration_months > 0 &&
    (ctx.targetCompletionDate?.trim?.()?.length ?? 0) > 0
  );
}

/** Tab indices: 0 Overview, 1 Financial, 2 Schedule, 3 Import (optional). Returns first tab that is incomplete. */
export function getFirstIncompleteTabIndex(ctx: ProjectContext | null): number {
  if (!ctx) return 0;
  if (!ctx.projectName.trim() || !ctx.currency) return 0;
  if (
    ctx.financialUnit == null ||
    ctx.projectValue_input <= 0 ||
    ctx.contingencyValue_input < 0
  )
    return 1;
  if (ctx.plannedDuration_months <= 0 || !ctx.targetCompletionDate?.trim()) return 2;
  return 3;
}

/** Contingency as % of project value (guard divide-by-zero). */
export function getContingencyPercent(ctx: ProjectContext): number | null {
  if (ctx.projectValue_m <= 0) return null;
  return (ctx.contingencyValue_m / ctx.projectValue_m) * 100;
}

/**
 * Format value stored in millions as $Xm or $X.Xbn (e.g. 217 → $217m, 1000 → $1.0bn).
 */
export function formatMoneyMillions(m: number): string {
  if (!Number.isFinite(m)) return "—";
  if (m >= 1000) {
    const bn = m / 1000;
    return bn >= 10 || bn % 1 === 0 ? `$${bn.toFixed(0)}bn` : `$${bn.toFixed(1)}bn`;
  }
  return m % 1 === 0 ? `$${m.toFixed(0)}m` : `$${m.toFixed(1)}m`;
}

function getProjectContextStorageKey(projectId?: string | null): string {
  if (projectId && typeof projectId === "string" && projectId.trim()) {
    return `${PROJECT_CONTEXT_STORAGE_KEY}_${projectId}`;
  }
  return PROJECT_CONTEXT_STORAGE_KEY;
}

/** Load from localStorage. When projectId is set, reads key for that project; else legacy single key. */
export function loadProjectContext(projectId?: string | null): ProjectContext | null {
  if (typeof window === "undefined") return null;
  try {
    const key = getProjectContextStorageKey(projectId);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return parseProjectContext(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Save to localStorage. When projectId is set, writes to key for that project; else legacy single key. */
export function saveProjectContext(ctx: ProjectContext, projectId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const parsed = parseProjectContext(ctx);
  if (!parsed) return false;
  try {
    const key = getProjectContextStorageKey(projectId);
    window.localStorage.setItem(key, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

/** Clear the stored project context from localStorage. When projectId is set, clears that project's key only. */
export function clearProjectContext(projectId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = getProjectContextStorageKey(projectId);
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export { PROJECT_CONTEXT_STORAGE_KEY };
