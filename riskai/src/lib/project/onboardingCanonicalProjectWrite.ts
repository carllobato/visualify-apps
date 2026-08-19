import {
  parseProjectContext,
  type ProjectContext,
  type ProjectCurrency,
  type RiskAppetite,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";
import {
  getProjectInformationValidationErrors,
  PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER,
  type ProjectInformationFieldKey,
  type RawNumericFields,
} from "@/lib/project/projectInformationFormValidation";
import { canonicalPatchFromProjectContext } from "@/lib/project/visualifyProjectsCanonicalWrite";

/** Internal v2-compatible unit retained on leftover settings helpers. Not shown in onboarding. */
export const ONBOARDING_SETTINGS_FINANCIAL_UNIT = "MILLIONS" as const;
export const ONBOARDING_FINANCIAL_INPUTS_VERSION = 2 as const;
export const ONBOARDING_SCHEDULE_INPUTS_VERSION = 2 as const;

export type OnboardingProjectFormValues = {
  projectName: string;
  projectCode: string;
  location: string;
  projectIndustry: string;
  projectStage: string;
  currency: ProjectCurrency;
  projectValueRaw: string;
  contingencyValueRaw: string;
  delayCostPerWorkingDayRaw: string;
  plannedDurationMonthsRaw: string;
  targetCompletionDate: string;
  workingDaysPerWeek: WorkingDaysPerWeek;
  scheduleContingencyWorkingDaysRaw: string;
  riskAppetite: RiskAppetite;
};

export const ONBOARDING_STEP_FIELD_KEYS: Record<1 | 2 | 3 | 4 | 5, readonly ProjectInformationFieldKey[]> = {
  1: ["projectName", "location", "projectIndustry", "projectStage"],
  2: ["currency"],
  3: ["riskAppetite"],
  4: ["projectValue_input", "contingencyValue_input", "delay_cost_per_working_day"],
  5: [
    "plannedDuration_months",
    "targetCompletionDate",
    "workingDaysPerWeek",
    "scheduleContingency_workingDays",
  ],
};

export function sanitizeOnboardingNumericInput(value: string): string {
  let sanitized = "";
  let seenDecimalPoint = false;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      sanitized += char;
      continue;
    }
    if (char === "." && !seenDecimalPoint) {
      sanitized += char;
      seenDecimalPoint = true;
    }
  }
  return sanitized;
}

function numberFromRaw(raw: string): number {
  const sanitized = sanitizeOnboardingNumericInput(raw);
  if (!sanitized) return 0;
  const n = Number(sanitized);
  return Number.isFinite(n) ? n : 0;
}

export function onboardingRawNumericFields(values: OnboardingProjectFormValues): RawNumericFields {
  return {
    projectValue_input: sanitizeOnboardingNumericInput(values.projectValueRaw),
    contingencyValue_input: sanitizeOnboardingNumericInput(values.contingencyValueRaw),
    plannedDuration_months: sanitizeOnboardingNumericInput(values.plannedDurationMonthsRaw),
    scheduleContingency_workingDays: sanitizeOnboardingNumericInput(
      values.scheduleContingencyWorkingDaysRaw,
    ),
    delay_cost_per_working_day: sanitizeOnboardingNumericInput(values.delayCostPerWorkingDayRaw),
  };
}

export function onboardingProjectContextDraft(values: OnboardingProjectFormValues): ProjectContext {
  const projectValue = numberFromRaw(values.projectValueRaw);
  const contingency = numberFromRaw(values.contingencyValueRaw);
  const delaySanitized = sanitizeOnboardingNumericInput(values.delayCostPerWorkingDayRaw);
  const delay = delaySanitized === "" ? null : numberFromRaw(values.delayCostPerWorkingDayRaw);
  const duration = numberFromRaw(values.plannedDurationMonthsRaw);
  const scheduleDays = numberFromRaw(values.scheduleContingencyWorkingDaysRaw);
  const durationInt = Number.isInteger(duration) ? duration : 0;
  const scheduleInt = Number.isInteger(scheduleDays) ? scheduleDays : 0;

  return {
    projectName: values.projectName,
    projectCode: values.projectCode,
    location: values.location,
    projectIndustry: values.projectIndustry,
    projectStage: values.projectStage,
    plannedDuration_months: durationInt,
    targetCompletionDate: values.targetCompletionDate,
    workingDaysPerWeek: values.workingDaysPerWeek,
    scheduleContingency_workingDays: scheduleInt,
    scheduleInputsVersion: ONBOARDING_SCHEDULE_INPUTS_VERSION,
    scheduleContingency_weeks:
      values.workingDaysPerWeek > 0 ? scheduleInt / values.workingDaysPerWeek : 0,
    riskAppetite: values.riskAppetite,
    currency: values.currency,
    financialUnit: ONBOARDING_SETTINGS_FINANCIAL_UNIT,
    financialInputsVersion: ONBOARDING_FINANCIAL_INPUTS_VERSION,
    projectValue_input: projectValue,
    contingencyValue_input: contingency,
    projectValue_m: projectValue / 1e6,
    contingencyValue_m: contingency / 1e6,
    approvedBudget_m: (projectValue + contingency) / 1e6,
    delay_cost_per_working_day: delay,
    delay_cost_per_day: delay,
  };
}

export function validateOnboardingProjectForm(
  values: OnboardingProjectFormValues,
): Record<string, string> {
  return getProjectInformationValidationErrors(
    onboardingProjectContextDraft(values),
    onboardingRawNumericFields(values),
  );
}

export function firstOnboardingStepError(
  step: 1 | 2 | 3 | 4 | 5,
  errors: Record<string, string>,
): string | undefined {
  for (const key of ONBOARDING_STEP_FIELD_KEYS[step]) {
    if (errors[key]) return errors[key];
  }
  return undefined;
}

export function firstOnboardingFormError(errors: Record<string, string>): string | undefined {
  const firstKey = PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER.find((key) => errors[key]);
  return firstKey ? errors[firstKey] : undefined;
}

export function parseOnboardingProjectContext(
  values: OnboardingProjectFormValues,
): ProjectContext | null {
  return parseProjectContext(onboardingProjectContextDraft(values));
}

export function onboardingCanonicalProjectPatchBody(ctx: ProjectContext): Record<string, unknown> {
  return {
    name: ctx.projectName.trim(),
    ...canonicalPatchFromProjectContext(ctx),
  };
}

/** Onboarding configuration succeeds when the canonical Project PATCH succeeds. */
export function onboardingReportedComplete(writes: { canonicalOk: boolean }): boolean {
  return writes.canonicalOk === true;
}
