import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
  type ProjectContext,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";

export const CANONICAL_WORKING_DAYS_PER_WEEK = WORKING_DAYS_PER_WEEK_VALUES;
export type CanonicalWorkingDaysPerWeek = WorkingDaysPerWeek;

const CANONICAL_CURRENCIES = new Set<string>(PROJECT_CURRENCY_VALUES);
const CANONICAL_INDUSTRIES = new Set<string>(PROJECT_INDUSTRY_VALUES);
const CANONICAL_STAGES = new Set<string>(PROJECT_STAGE_VALUES);
const CANONICAL_RISK_APPETITE = new Set<string>(RISK_APPETITE_VALUES);

/**
 * Canonical `visualify_projects` columns written by Project Information.
 * Omitted keys are left unchanged (no invented defaults / no backfill).
 */
export type VisualifyProjectsCanonicalPatch = {
  project_name: string;
  project_code?: string | null;
  project_location?: string | null;
  project_industry?: string | null;
  project_stage?: string | null;
  project_currency?: string;
  project_value?: number;
  project_contingency?: number;
  project_delay_cost_per_working_day?: number | null;
  project_planned_duration_months?: number;
  project_target_completion_date?: string;
  project_working_days_per_week?: CanonicalWorkingDaysPerWeek;
  project_schedule_contingency_working_days?: number;
  project_risk_appetite?: string;
};

export type ParseCanonicalProjectFieldsResult =
  | { ok: true; patch: Partial<VisualifyProjectsCanonicalPatch> }
  | { ok: false; error: string };

function isCanonicalWorkingDaysPerWeek(value: unknown): value is CanonicalWorkingDaysPerWeek {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (CANONICAL_WORKING_DAYS_PER_WEEK as readonly number[]).includes(value)
  );
}

function asNonNegativeFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function asNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function asOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && Number.isNaN(new Date(trimmed).getTime())) {
    return null;
  }
  if (Number.isNaN(new Date(trimmed).getTime())) return null;
  return trimmed;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

function asOptionalControlledText(
  value: unknown,
  allowed: Set<string>,
): { ok: true; value: string | null } | { ok: false } {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (!allowed.has(trimmed)) return { ok: false };
  return { ok: true, value: trimmed };
}

/**
 * Map a validated Project Information payload to canonical `visualify_projects` columns.
 *
 * Financial values are raw major-currency amounts (no thousands/millions/billions scaling).
 * Schedule contingency is working days, never weeks.
 * Identity fields are the current form values only — never remapped, never invented.
 */
export function canonicalPatchFromProjectContext(
  ctx: ProjectContext,
): VisualifyProjectsCanonicalPatch {
  const projectName = ctx.projectName.trim();
  const location = ctx.location?.trim() ? ctx.location.trim() : null;
  const projectCode = ctx.projectCode?.trim() ? ctx.projectCode.trim() : null;
  const projectIndustry = ctx.projectIndustry?.trim() ? ctx.projectIndustry.trim() : null;
  const projectStage = ctx.projectStage?.trim() ? ctx.projectStage.trim() : null;

  return {
    project_name: projectName,
    project_code: projectCode,
    project_location: location,
    project_industry: projectIndustry,
    project_stage: projectStage,
    project_currency: ctx.currency,
    project_value: ctx.projectValue_input,
    project_contingency: ctx.contingencyValue_input,
    project_delay_cost_per_working_day: ctx.delay_cost_per_working_day,
    project_planned_duration_months: ctx.plannedDuration_months,
    project_target_completion_date: ctx.targetCompletionDate,
    project_working_days_per_week: ctx.workingDaysPerWeek,
    project_schedule_contingency_working_days: ctx.scheduleContingency_workingDays,
    project_risk_appetite: ctx.riskAppetite,
  };
}

/**
 * Parse optional `project_*` fields from PATCH `/api/projects/[projectId]`.
 * Absent keys are omitted. Present invalid values fail the request.
 */
export function parseCanonicalProjectFieldsFromPatchBody(
  record: Record<string, unknown>,
): ParseCanonicalProjectFieldsResult {
  const patch: Partial<VisualifyProjectsCanonicalPatch> = {};

  if ("project_name" in record) {
    if (typeof record.project_name !== "string" || !record.project_name.trim()) {
      return { ok: false, error: "project_name must be a non-empty string" };
    }
    patch.project_name = record.project_name.trim();
  }

  if ("project_code" in record) {
    const value = asOptionalText(record.project_code);
    if (value === undefined && record.project_code !== null) {
      return { ok: false, error: "Invalid project_code" };
    }
    patch.project_code = value ?? null;
  }

  if ("project_location" in record) {
    const value = asOptionalText(record.project_location);
    if (value === undefined && record.project_location !== null) {
      return { ok: false, error: "Invalid project_location" };
    }
    patch.project_location = value ?? null;
  }

  if ("project_industry" in record) {
    const parsed = asOptionalControlledText(record.project_industry, CANONICAL_INDUSTRIES);
    if (!parsed.ok) {
      return { ok: false, error: "Invalid project_industry" };
    }
    patch.project_industry = parsed.value;
  }

  if ("project_stage" in record) {
    const parsed = asOptionalControlledText(record.project_stage, CANONICAL_STAGES);
    if (!parsed.ok) {
      return { ok: false, error: "Invalid project_stage" };
    }
    patch.project_stage = parsed.value;
  }

  if ("project_currency" in record) {
    if (typeof record.project_currency !== "string" || !CANONICAL_CURRENCIES.has(record.project_currency)) {
      return { ok: false, error: "Invalid project_currency" };
    }
    patch.project_currency = record.project_currency;
  }

  if ("project_value" in record) {
    const value = asNonNegativeFiniteNumber(record.project_value);
    if (value == null) {
      return { ok: false, error: "Invalid project_value" };
    }
    patch.project_value = value;
  }

  if ("project_contingency" in record) {
    const value = asNonNegativeFiniteNumber(record.project_contingency);
    if (value == null) {
      return { ok: false, error: "Invalid project_contingency" };
    }
    patch.project_contingency = value;
  }

  if ("project_delay_cost_per_working_day" in record) {
    if (record.project_delay_cost_per_working_day === null) {
      patch.project_delay_cost_per_working_day = null;
    } else {
      const value = asNonNegativeFiniteNumber(record.project_delay_cost_per_working_day);
      if (value == null) {
        return { ok: false, error: "Invalid project_delay_cost_per_working_day" };
      }
      patch.project_delay_cost_per_working_day = value;
    }
  }

  if ("project_planned_duration_months" in record) {
    const value = asNonNegativeInteger(record.project_planned_duration_months);
    if (value == null) {
      return { ok: false, error: "Invalid project_planned_duration_months" };
    }
    patch.project_planned_duration_months = value;
  }

  if ("project_target_completion_date" in record) {
    const value = asIsoDate(record.project_target_completion_date);
    if (!value) {
      return { ok: false, error: "Invalid project_target_completion_date" };
    }
    patch.project_target_completion_date = value;
  }

  if ("project_working_days_per_week" in record) {
    if (!isCanonicalWorkingDaysPerWeek(record.project_working_days_per_week)) {
      return { ok: false, error: "Invalid project_working_days_per_week" };
    }
    patch.project_working_days_per_week = record.project_working_days_per_week;
  }

  if ("project_schedule_contingency_working_days" in record) {
    const value = asNonNegativeInteger(record.project_schedule_contingency_working_days);
    if (value == null) {
      return { ok: false, error: "Invalid project_schedule_contingency_working_days" };
    }
    patch.project_schedule_contingency_working_days = value;
  }

  if ("project_risk_appetite" in record) {
    if (
      typeof record.project_risk_appetite !== "string" ||
      !CANONICAL_RISK_APPETITE.has(record.project_risk_appetite)
    ) {
      return { ok: false, error: "Invalid project_risk_appetite" };
    }
    patch.project_risk_appetite = record.project_risk_appetite;
  }

  return { ok: true, patch };
}

/** `visualify_projects` UPDATE payload: keep `name` live and dual-write `project_name`. */
export function visualifyProjectsMetadataUpdatePayload(args: {
  name: string;
  canonical?: Partial<VisualifyProjectsCanonicalPatch>;
}): Record<string, unknown> {
  const canonical = omitUndefined({ ...(args.canonical ?? {}) });
  return omitUndefined({
    name: args.name,
    project_name: canonical.project_name ?? args.name,
    ...canonical,
  });
}
