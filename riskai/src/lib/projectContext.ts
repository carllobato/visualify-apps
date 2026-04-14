/**
 * Project context: baseline project attributes used to interpret risk outputs.
 * Persisted in localStorage under key PROJECT_CONTEXT_STORAGE_KEY.
 * Optional server sync via POST /api/project-context (see getProjectContext.ts).
 */

export type RiskAppetite =
  | "P10"
  | "P20"
  | "P30"
  | "P40"
  | "P50"
  | "P60"
  | "P70"
  | "P80"
  | "P90";

/** Map settings Risk Appetite (e.g. P80) to cumulative percentile 0–100 for distribution targets. */
export function riskAppetiteToPercent(
  appetite: RiskAppetite | string | null | undefined
): number {
  if (appetite == null || typeof appetite !== "string") return 80;
  const n = parseInt(appetite.replace(/^P/i, ""), 10);
  return Number.isFinite(n) ? n : 80;
}

export type ProjectCurrency = "AUD" | "USD" | "GBP";

export type FinancialUnit = "THOUSANDS" | "MILLIONS" | "BILLIONS";

export type ProjectContext = {
  projectName: string;
  location?: string;
  plannedDuration_months: number;
  targetCompletionDate: string; // ISO date
  scheduleContingency_weeks: number;
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
  /** Indirect cost rate in major currency units per calendar day (e.g. dollars/day). */
  delay_cost_per_day: number | null;
};

const PROJECT_CONTEXT_STORAGE_KEY = "riskai_project_context_v1";

const RISK_APPETITE_VALUES: RiskAppetite[] = [
  "P10",
  "P20",
  "P30",
  "P40",
  "P50",
  "P60",
  "P70",
  "P80",
  "P90",
];
const CURRENCY_VALUES: ProjectCurrency[] = ["AUD", "USD", "GBP"];
const FINANCIAL_UNIT_VALUES: FinancialUnit[] = ["THOUSANDS", "MILLIONS", "BILLIONS"];

function isNonNegativeNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function isNonNegativeInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
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

/**
 * Hydrate project context from a `visualify_project_settings` row.
 * Legacy rows (`financial_inputs_version` ≠ 2): value columns are scaled by `financial_unit`.
 * v2 rows: `project_value_input`, `contingency_value_input`, and `delay_cost_per_day` are major currency.
 */
export function parseProjectContextFromVisualifyProjectSettingsRow(
  row: Record<string, unknown>
): ProjectContext | null {
  const financialUnit =
    typeof row.financial_unit === "string" && FINANCIAL_UNIT_VALUES.includes(row.financial_unit as FinancialUnit)
      ? (row.financial_unit as FinancialUnit)
      : "MILLIONS";

  const inputsVersion = financialInputsVersionFromSettingsRow(row);

  const pvScaled =
    typeof row.project_value_input === "number" && Number.isFinite(row.project_value_input)
      ? row.project_value_input
      : 0;
  const cvScaled =
    typeof row.contingency_value_input === "number" && Number.isFinite(row.contingency_value_input)
      ? row.contingency_value_input
      : 0;

  let delayScaled: number | null = null;
  if (row.delay_cost_per_day !== undefined && row.delay_cost_per_day !== null) {
    const d = row.delay_cost_per_day;
    if (typeof d === "number" && Number.isFinite(d) && d >= 0) {
      delayScaled = d;
    } else if (typeof d === "string") {
      const t = d.trim();
      if (t !== "") {
        const n = Number(t);
        if (Number.isFinite(n) && n >= 0) delayScaled = n;
      }
    }
  }

  const projectValueMajor =
    inputsVersion === 2
      ? pvScaled
      : majorCurrencyFromLegacyScaledInput(pvScaled, financialUnit);
  const contingencyValueMajor =
    inputsVersion === 2
      ? cvScaled
      : majorCurrencyFromLegacyScaledInput(cvScaled, financialUnit);
  const delayMajor =
    delayScaled == null
      ? null
      : inputsVersion === 2
        ? delayScaled
        : majorCurrencyFromLegacyScaledInput(delayScaled, financialUnit);

  const raw = {
    projectName: typeof row.project_name === "string" ? row.project_name : "",
    location:
      row.location !== undefined && row.location !== null && typeof row.location === "string"
        ? row.location.trim()
        : undefined,
    plannedDuration_months: row.planned_duration_months,
    targetCompletionDate: targetCompletionDateFromDb(row.target_completion_date),
    scheduleContingency_weeks: row.schedule_contingency_weeks,
    riskAppetite: row.risk_appetite,
    currency: row.currency,
    financialUnit: "MILLIONS" as FinancialUnit,
    financialInputsVersion: 2 as const,
    projectValue_input: projectValueMajor,
    contingencyValue_input: contingencyValueMajor,
    delay_cost_per_day: delayMajor,
  };
  return parseProjectContext(raw);
}

/** Validates raw object; returns validated ProjectContext or null. Handles legacy migration. */
export function parseProjectContext(raw: unknown): ProjectContext | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const projectName = typeof o.projectName === "string" ? o.projectName.trim() : "";
  const location =
    o.location !== undefined && o.location !== null && typeof o.location === "string"
      ? o.location.trim()
      : undefined;
  const plannedDuration_months = isNonNegativeInteger(o.plannedDuration_months) ? o.plannedDuration_months : 0;
  const targetCompletionDate =
    typeof o.targetCompletionDate === "string" && isIsoDateString(o.targetCompletionDate)
      ? o.targetCompletionDate
      : "";
  const scheduleContingency_weeks = isNonNegativeNumber(o.scheduleContingency_weeks)
    ? o.scheduleContingency_weeks
    : 0;
  const riskAppetite =
    typeof o.riskAppetite === "string" && RISK_APPETITE_VALUES.includes(o.riskAppetite as RiskAppetite)
      ? (o.riskAppetite as RiskAppetite)
      : "P80";
  const currency =
    typeof o.currency === "string" && CURRENCY_VALUES.includes(o.currency as ProjectCurrency)
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

  let delay_cost_per_day: number | null = null;
  if (o.delay_cost_per_day !== undefined && o.delay_cost_per_day !== null) {
    const v = o.delay_cost_per_day;
    let n: number | null = null;
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      n = v;
    } else if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") {
        const parsed = Number(t);
        if (Number.isFinite(parsed) && parsed >= 0) n = parsed;
      }
    }
    if (n != null) {
      delay_cost_per_day =
        financialInputsVersion === 2 ? n : majorCurrencyFromLegacyScaledInput(n, legacyFinancialUnit);
    }
  }

  return {
    projectName,
    location,
    plannedDuration_months,
    targetCompletionDate,
    scheduleContingency_weeks,
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
