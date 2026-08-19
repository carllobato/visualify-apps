import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
  type ProjectContext,
} from "@/lib/projectContext";

export const PROJECT_INFORMATION_MAX_MONTHS = 600;
export const PROJECT_INFORMATION_MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS = 3120;

export const REQUIRED_NUMERIC_KEYS = [
  "projectValue_input",
  "contingencyValue_input",
  "plannedDuration_months",
  "scheduleContingency_workingDays",
  "delay_cost_per_working_day",
] as const;

export type ProjectInformationNumericKey = (typeof REQUIRED_NUMERIC_KEYS)[number];

export type RawNumericFields = Partial<Record<ProjectInformationNumericKey, string>>;

export const PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER = [
  "projectName",
  "location",
  "projectIndustry",
  "projectStage",
  "currency",
  "projectValue_input",
  "contingencyValue_input",
  "delay_cost_per_working_day",
  "plannedDuration_months",
  "targetCompletionDate",
  "workingDaysPerWeek",
  "scheduleContingency_workingDays",
  "riskAppetite",
] as const;

export type ProjectInformationFieldKey =
  (typeof PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER)[number];

function rawOrStored(
  rawNumeric: RawNumericFields,
  key: Exclude<ProjectInformationNumericKey, "delay_cost_per_working_day">,
  stored: number,
): string {
  if (rawNumeric[key] !== undefined) return rawNumeric[key] ?? "";
  return stored === 0 ? "" : String(stored);
}

function rawOrStoredDelay(rawNumeric: RawNumericFields, stored: number | null): string {
  if (rawNumeric.delay_cost_per_working_day !== undefined) {
    return rawNumeric.delay_cost_per_working_day ?? "";
  }
  return stored == null ? "" : String(stored);
}

function requiredNonNegativeNumber(raw: string): string | undefined {
  if (raw === "") return "This field is required";
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return "Enter a valid number";
  return undefined;
}

export function isAllowedProjectIndustry(value: string): boolean {
  return (PROJECT_INDUSTRY_VALUES as readonly string[]).includes(value);
}

export function isAllowedProjectStage(value: string): boolean {
  return (PROJECT_STAGE_VALUES as readonly string[]).includes(value);
}

/**
 * Project Information save validation. Empty is missing; a stored/typed 0 is not.
 * Legacy industry/stage values are left visible but are not valid for save.
 */
export function getProjectInformationValidationErrors(
  form: ProjectContext,
  rawNumeric: RawNumericFields,
): Record<string, string> {
  const err: Record<string, string> = {};

  if (!form.projectName.trim()) err.projectName = "This field is required";
  if (!form.location?.trim()) err.location = "This field is required";

  const industry = form.projectIndustry?.trim() ?? "";
  if (!industry) err.projectIndustry = "This field is required";
  else if (!isAllowedProjectIndustry(industry)) err.projectIndustry = "Select a valid project industry";

  const stage = form.projectStage?.trim() ?? "";
  if (!stage) err.projectStage = "This field is required";
  else if (!isAllowedProjectStage(stage)) err.projectStage = "Select a valid project stage";

  if (!(PROJECT_CURRENCY_VALUES as readonly string[]).includes(form.currency)) {
    err.currency = "This field is required";
  }

  const rawPv = rawOrStored(rawNumeric, "projectValue_input", form.projectValue_input);
  const pvErr = requiredNonNegativeNumber(rawPv);
  if (pvErr) err.projectValue_input = pvErr;

  const rawCv = rawOrStored(rawNumeric, "contingencyValue_input", form.contingencyValue_input);
  const cvErr = requiredNonNegativeNumber(rawCv);
  if (cvErr) err.contingencyValue_input = cvErr;

  const rawDelay = rawOrStoredDelay(rawNumeric, form.delay_cost_per_working_day);
  const delayErr = requiredNonNegativeNumber(rawDelay);
  if (delayErr) err.delay_cost_per_working_day = delayErr;

  const rawDur = rawOrStored(rawNumeric, "plannedDuration_months", form.plannedDuration_months);
  const durErr = requiredNonNegativeNumber(rawDur);
  if (durErr) err.plannedDuration_months = durErr;
  else {
    const n = Number(rawDur);
    if (n > PROJECT_INFORMATION_MAX_MONTHS) {
      err.plannedDuration_months = `Duration must be between 0 and ${PROJECT_INFORMATION_MAX_MONTHS} months.`;
    } else if (!Number.isInteger(n)) {
      err.plannedDuration_months = "Duration must be a whole number of months.";
    }
  }

  if (!form.targetCompletionDate.trim()) err.targetCompletionDate = "This field is required";

  if (!(WORKING_DAYS_PER_WEEK_VALUES as readonly number[]).includes(form.workingDaysPerWeek)) {
    err.workingDaysPerWeek = "This field is required";
  }

  const rawSc = rawOrStored(
    rawNumeric,
    "scheduleContingency_workingDays",
    form.scheduleContingency_workingDays,
  );
  const scErr = requiredNonNegativeNumber(rawSc);
  if (scErr) err.scheduleContingency_workingDays = scErr;
  else {
    const n = Number(rawSc);
    if (n > PROJECT_INFORMATION_MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS) {
      err.scheduleContingency_workingDays =
        `Schedule contingency must be between 0 and ${PROJECT_INFORMATION_MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS} working days.`;
    } else if (!Number.isInteger(n)) {
      err.scheduleContingency_workingDays = "Schedule contingency must be a whole number of working days.";
    }
  }

  if (!(RISK_APPETITE_VALUES as readonly string[]).includes(form.riskAppetite)) {
    err.riskAppetite = "This field is required";
  }

  return err;
}

/** After a valid save, keep zeros visible instead of converting them back to empty. */
export function rawNumericFieldsFromSavedContext(stored: ProjectContext): RawNumericFields {
  return {
    projectValue_input: String(stored.projectValue_input),
    contingencyValue_input: String(stored.contingencyValue_input),
    plannedDuration_months: String(stored.plannedDuration_months),
    scheduleContingency_workingDays: String(stored.scheduleContingency_workingDays),
    delay_cost_per_working_day:
      stored.delay_cost_per_working_day == null ? "" : String(stored.delay_cost_per_working_day),
  };
}

/** Include a stored legacy value in a dropdown without mapping it to a canonical option. */
export function dropdownOptionsWithLegacyValue(
  allowed: readonly string[],
  current: string | undefined,
): { value: string; label: string }[] {
  const options = allowed.map((value) => ({ value, label: value }));
  const trimmed = current?.trim() ?? "";
  if (trimmed && !allowed.includes(trimmed)) {
    options.unshift({ value: trimmed, label: trimmed });
  }
  return options;
}
