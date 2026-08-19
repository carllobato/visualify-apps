"use client";

/**
 * Project Settings page: define baseline project context used to interpret risk outputs.
 * With a project selected: hydrate Project Context from canonical `visualify_projects`
 * only. Save PATCHes canonical `visualify_projects` via `/api/projects/[projectId]`.
 * After a successful canonical save, mirrors to localStorage (`riskai_project_context_v1`).
 * Does not read or write `visualify_project_settings`.
 * Legacy (no project): localStorage only. Optional: POST /api/project-context.
 */

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ProjectContext,
  type RiskAppetite,
  type ProjectCurrency,
  type WorkingDaysPerWeek,
  loadProjectContext,
  saveProjectContext,
  clearProjectContext,
  parseProjectContext,
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
} from "@/lib/projectContext";
import { ProjectExcelUploadSection } from "@/components/project/ProjectExcelUploadSection";
import { ProjectMembersSection } from "@/components/project/ProjectMembersSection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { useRiskRegister } from "@/store/risk-register.store";
import { RiskDetailModal } from "@/components/risk-register/RiskDetailModal";
import { RiskRegisterLookupProviders } from "@/components/risk-register/RiskRegisterLookupProviders";
import { distinctOwnerNamesFromRisks } from "@/components/risk-register/RiskProjectOwnersContext";
import { isRiskStatusArchived } from "@/domain/risk/riskFieldSemantics";
import { useOptionalPageHeaderExtras } from "@/contexts/PageHeaderExtrasContext";
import { useProjectPermissions } from "@/contexts/ProjectPermissionsContext";
import { useProjectCanonicalCompleteness } from "@/contexts/ProjectCanonicalCompletenessContext";
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
import { postArchiveNavigatePath } from "@/lib/project/projectArchiveLifecycle";
import { canonicalPatchFromProjectContext } from "@/lib/project/visualifyProjectsCanonicalWrite";
import {
  dropdownOptionsWithLegacyValue,
  getProjectInformationValidationErrors,
  PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER,
  PROJECT_INFORMATION_MAX_MONTHS,
  PROJECT_INFORMATION_MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS,
  rawNumericFieldsFromSavedContext,
  REQUIRED_NUMERIC_KEYS,
  type RawNumericFields,
} from "@/lib/project/projectInformationFormValidation";
import {
  CANONICAL_PROJECT_COMPLETENESS_SELECT,
  hydrateProjectInformationFromCanonicalRow,
} from "@/lib/project/canonicalProjectCompleteness";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  FieldError,
  HelperText,
  Label,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
} from "@visualify/design-system";
import {
  projectSettingsFieldWidthClass,
  projectSettingsInputClass,
  projectSettingsNumberInputClass,
  projectSettingsReadOnlyFieldClass,
  projectSettingsSelectClass,
} from "@/components/project/projectSettingsDsFormClasses";
import {
  PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE,
  PROJECT_SETUP_INCOMPLETE_EDITOR_NOTICE,
  PROJECT_SETUP_INCOMPLETE_READONLY_NOTICE,
} from "@/lib/settings/settingsPermissionMessages";

const MAX_MONTHS = PROJECT_INFORMATION_MAX_MONTHS;
const MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS = PROJECT_INFORMATION_MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS;

const CURRENCY_OPTIONS = PROJECT_CURRENCY_VALUES.map((value) => ({ value, label: value }));
const RISK_APPETITE_OPTIONS = RISK_APPETITE_VALUES.map((value) => ({ value, label: value }));
const WORKING_CALENDAR_OPTIONS = WORKING_DAYS_PER_WEEK_VALUES.map((value) => ({
  value,
  label: String(value),
}));

function defaultContext(): ProjectContext {
  return {
    projectName: "",
    projectCode: "",
    location: "",
    projectIndustry: "",
    projectStage: "",
    plannedDuration_months: 0,
    targetCompletionDate: "",
    scheduleContingency_weeks: 0,
    workingDaysPerWeek: 5,
    scheduleContingency_workingDays: 0,
    scheduleInputsVersion: 2,
    riskAppetite: "P80",
    currency: "AUD",
    financialUnit: "MILLIONS",
    financialInputsVersion: 2,
    projectValue_input: 0,
    contingencyValue_input: 0,
    projectValue_m: 0,
    contingencyValue_m: 0,
    approvedBudget_m: 0,
    delay_cost_per_day: null,
    delay_cost_per_working_day: null,
  };
}

export type ProjectInformationPageProps = { projectId?: string | null };
type ProjectSettingsTab = "overview" | "parameters" | "team" | "files" | "archive" | "danger";

const FIELD_TAB_MAP: Partial<Record<(typeof PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER)[number], ProjectSettingsTab>> = {
  projectName: "overview",
  location: "overview",
  projectIndustry: "overview",
  projectStage: "overview",
  currency: "parameters",
  projectValue_input: "parameters",
  contingencyValue_input: "parameters",
  delay_cost_per_working_day: "parameters",
  plannedDuration_months: "parameters",
  targetCompletionDate: "parameters",
  workingDaysPerWeek: "parameters",
  scheduleContingency_workingDays: "parameters",
  riskAppetite: "parameters",
};

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

function formatGroupedNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);
}

function currencySymbol(currency: ProjectCurrency): string {
  if (currency === "GBP") return "£";
  if (currency === "EUR") return "€";
  if (currency === "AED") return "AED";
  return "$";
}

/** Whole-currency display for project value, contingency, and delay (major units; no k/m/b scaling). */
function formatMajorCurrencyDisplay(amount: number, currency: ProjectCurrency): string {
  return `${currencySymbol(currency)} ${formatGroupedNumber(amount)}`;
}

function rawNumericFieldsFromContext(stored: ProjectContext): RawNumericFields {
  return {
    projectValue_input: stored.projectValue_input === 0 ? "" : String(stored.projectValue_input),
    contingencyValue_input: stored.contingencyValue_input === 0 ? "" : String(stored.contingencyValue_input),
    plannedDuration_months: stored.plannedDuration_months === 0 ? "" : String(stored.plannedDuration_months),
    scheduleContingency_workingDays:
      stored.scheduleContingency_workingDays === 0 ? "" : String(stored.scheduleContingency_workingDays),
    delay_cost_per_working_day:
      stored.delay_cost_per_working_day == null ? "" : String(stored.delay_cost_per_working_day),
  };
}

/** Stable snapshot for dirty detection (matches persisted fields + raw numeric strings). */
function projectSettingsPersistFingerprint(form: ProjectContext, raw: RawNumericFields): string {
  return JSON.stringify({
    projectName: form.projectName,
    projectCode: form.projectCode ?? "",
    location: form.location ?? "",
    projectIndustry: form.projectIndustry ?? "",
    projectStage: form.projectStage ?? "",
    plannedDuration_months: form.plannedDuration_months,
    targetCompletionDate: form.targetCompletionDate,
    workingDaysPerWeek: form.workingDaysPerWeek,
    scheduleContingency_workingDays: form.scheduleContingency_workingDays,
    scheduleInputsVersion: form.scheduleInputsVersion,
    riskAppetite: form.riskAppetite,
    currency: form.currency,
    projectValue_input: form.projectValue_input,
    contingencyValue_input: form.contingencyValue_input,
    delay_cost_per_working_day: form.delay_cost_per_working_day,
    raw: {
      projectValue_input: raw.projectValue_input ?? "",
      contingencyValue_input: raw.contingencyValue_input ?? "",
      plannedDuration_months: raw.plannedDuration_months ?? "",
      scheduleContingency_workingDays: raw.scheduleContingency_workingDays ?? "",
      delay_cost_per_working_day: raw.delay_cost_per_working_day ?? "",
    },
  });
}

export default function ProjectInformationPage({ projectId }: ProjectInformationPageProps = {}) {
  const projectPermissions = useProjectPermissions();
  const canonicalComplete = useProjectCanonicalCompleteness();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const settingsReadOnly =
    Boolean(projectId) &&
    (projectPermissions == null || !projectPermissions.canEditProjectMetadata);
  const setupIncomplete = projectId != null && canonicalComplete === false;
  const riskUiReadOnly =
    Boolean(projectId) &&
    (projectPermissions == null || !projectPermissions.canEditContent);
  const canArchiveProject = Boolean(projectId && projectPermissions?.canArchiveProject);

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<ProjectContext>(defaultContext());
  const [rawNumericFields, setRawNumericFields] = useState<RawNumericFields>({});
  /** Last saved / loaded fingerprint; null while (re)loading settings for a project. */
  const [savedBaselineFingerprint, setSavedBaselineFingerprint] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showArchivedReviewModal, setShowArchivedReviewModal] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectSettingsTab>("overview");
  const [validation, setValidation] = useState<Record<string, string>>({});
  const router = useRouter();
  const { risks, updateRisk, restoreArchivedRisk } = useRiskRegister();
  const archivedRisks = useMemo(
    () =>
      risks
        .filter((r) => isRiskStatusArchived(r.status))
        .sort((a, b) => (a.riskNumber ?? 0) - (b.riskNumber ?? 0)),
    [risks]
  );
  const extraOwnerNamesFromRisks = useMemo(
    () => distinctOwnerNamesFromRisks(archivedRisks),
    [archivedRisks]
  );
  const savedHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const projectCodeRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const projectIndustryRef = useRef<HTMLSelectElement>(null);
  const projectStageRef = useRef<HTMLSelectElement>(null);
  const currencyRef = useRef<HTMLSelectElement>(null);
  const projectValueRef = useRef<HTMLInputElement>(null);
  const contingencyValueRef = useRef<HTMLInputElement>(null);
  const plannedDurationRef = useRef<HTMLInputElement>(null);
  const targetCompletionDateRef = useRef<HTMLInputElement>(null);
  const workingCalendarRef = useRef<HTMLSelectElement>(null);
  const scheduleContingencyRef = useRef<HTMLInputElement>(null);
  const delayCostPerWorkingDayRef = useRef<HTMLInputElement>(null);
  const riskAppetiteRef = useRef<HTMLSelectElement>(null);
  const fieldRefsRef = useRef<Record<string, RefObject<HTMLElement | null>>>({
    projectName: projectNameRef,
    projectCode: projectCodeRef,
    location: locationRef,
    projectIndustry: projectIndustryRef,
    projectStage: projectStageRef,
    currency: currencyRef,
    projectValue_input: projectValueRef,
    contingencyValue_input: contingencyValueRef,
    delay_cost_per_working_day: delayCostPerWorkingDayRef,
    plannedDuration_months: plannedDurationRef,
    targetCompletionDate: targetCompletionDateRef,
    workingDaysPerWeek: workingCalendarRef,
    scheduleContingency_workingDays: scheduleContingencyRef,
    riskAppetite: riskAppetiteRef,
  });

  const riskRegisterHref = projectId ? riskaiPath(`/projects/${projectId}/risks`) : DASHBOARD_PATH;

  useEffect(() => {
    let cancelled = false;
    const trimmedProjectId = projectId?.trim();
    setMounted(false);
    setSavedBaselineFingerprint(null);

    if (!trimmedProjectId) {
      const stored = loadProjectContext(trimmedProjectId || undefined);
      let nextForm = defaultContext();
      let nextRaw: RawNumericFields = rawNumericFieldsFromContext(nextForm);
      if (stored) {
        nextForm = stored;
        nextRaw = rawNumericFieldsFromContext(stored);
      }
      setForm(nextForm);
      setRawNumericFields(nextRaw);
      setSavedBaselineFingerprint(projectSettingsPersistFingerprint(nextForm, nextRaw));
      setMounted(true);
      return;
    }

    void (async () => {
      const supabase = supabaseBrowserClient();
      const projectResult = await supabase
        .from("visualify_projects")
        .select(`project_code, ${CANONICAL_PROJECT_COMPLETENESS_SELECT}`)
        .eq("id", trimmedProjectId)
        .maybeSingle();

      if (cancelled) return;

      const canonicalRow =
        !projectResult.error && projectResult.data && typeof projectResult.data === "object"
          ? (projectResult.data as Record<string, unknown>)
          : null;
      const { form: nextForm, raw: nextRaw } = hydrateProjectInformationFromCanonicalRow(canonicalRow);

      setForm(nextForm);
      setRawNumericFields(nextRaw);
      setSavedBaselineFingerprint(projectSettingsPersistFingerprint(nextForm, nextRaw));
      setMounted(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (savedHideTimeoutRef.current) clearTimeout(savedHideTimeoutRef.current);
    };
  }, []);

  const update = useCallback(
    <K extends keyof ProjectContext>(key: K, value: ProjectContext[K], raw?: string) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        const pvInput = key === "projectValue_input" ? (value as number) : prev.projectValue_input;
        const cvInput = key === "contingencyValue_input" ? (value as number) : prev.contingencyValue_input;
        const workingDaysPerWeek =
          key === "workingDaysPerWeek" ? (value as WorkingDaysPerWeek) : prev.workingDaysPerWeek;
        const scheduleContingencyWorkingDays =
          key === "scheduleContingency_workingDays"
            ? (value as number)
            : prev.scheduleContingency_workingDays;
        if (key === "projectValue_input" || key === "contingencyValue_input") {
          next.projectValue_m = pvInput / 1e6;
          next.contingencyValue_m = cvInput / 1e6;
          next.approvedBudget_m = next.projectValue_m + next.contingencyValue_m;
        }
        if (key === "workingDaysPerWeek" || key === "scheduleContingency_workingDays") {
          next.scheduleInputsVersion = 2;
          next.scheduleContingency_weeks =
            workingDaysPerWeek > 0 ? scheduleContingencyWorkingDays / workingDaysPerWeek : 0;
        }
        if (key === "delay_cost_per_working_day") {
          next.delay_cost_per_day = value as number | null;
        }
        return next;
      });
      if (
        raw !== undefined &&
        REQUIRED_NUMERIC_KEYS.includes(key as (typeof REQUIRED_NUMERIC_KEYS)[number])
      ) {
        setRawNumericFields((prev) => ({ ...prev, [key]: raw }));
      }
      setValidation((prev) => ({ ...prev, [key]: "" }));
      if (saved) setSaved(false);
      setSaveError(null);
    },
    [saved]
  );

  const onSave = useCallback(async () => {
    if (settingsReadOnly) return;
    setSaveError(null);
    const err = getProjectInformationValidationErrors(form, rawNumericFields);
    setValidation(err);
    if (Object.keys(err).length > 0) {
      const firstKey = PROJECT_INFORMATION_FIRST_INVALID_FIELD_ORDER.find((k) => err[k]);
      if (firstKey) {
        const targetTab = FIELD_TAB_MAP[firstKey];
        if (targetTab && targetTab !== activeTab) setActiveTab(targetTab);
      }
      setTimeout(() => {
        const ref = firstKey ? fieldRefsRef.current[firstKey]?.current : null;
        ref?.scrollIntoView({ behavior: "smooth", block: "center" });
        ref?.focus();
      }, 0);
      return;
    }
    const parsed = parseProjectContext(form);
    if (!parsed) return;
    const toSave: ProjectContext = parsed;

    if (projectId) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: toSave.projectName,
            ...canonicalPatchFromProjectContext(toSave),
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setSaveError(data.error ?? "Could not save project details.");
          return;
        }
        router.refresh();
      } catch {
        setSaveError("Could not save project details.");
        return;
      }
    }

    const okLs = saveProjectContext(toSave, projectId ?? undefined);
    if (!projectId && !okLs) {
      return;
    }

    setForm(toSave);
    const nextRaw = rawNumericFieldsFromSavedContext(toSave);
    setRawNumericFields(nextRaw);
    setSavedBaselineFingerprint(projectSettingsPersistFingerprint(toSave, nextRaw));
    setSaved(true);
    if (savedHideTimeoutRef.current) clearTimeout(savedHideTimeoutRef.current);
    savedHideTimeoutRef.current = setTimeout(() => {
      setSaved(false);
      savedHideTimeoutRef.current = null;
    }, SAVED_CONFIRM_AUTO_HIDE_MS);
    fetch("/api/project-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...toSave,
        ...(projectId ? { projectId } : {}),
      }),
    }).catch(() => {});
  }, [activeTab, form, rawNumericFields, projectId, router, settingsReadOnly]);

  const onClear = useCallback(() => {
    if (settingsReadOnly) return;
    setShowClearConfirm(false);
    clearProjectContext(projectId ?? undefined);
    const cleared = defaultContext();
    const clearedRaw: RawNumericFields = {};
    setForm(cleared);
    setRawNumericFields(clearedRaw);
    setSavedBaselineFingerprint(projectSettingsPersistFingerprint(cleared, clearedRaw));
    setSaved(false);
    setSaveError(null);
    setValidation({});
  }, [projectId, settingsReadOnly]);

  const confirmArchiveProject = useCallback(async () => {
    if (!projectId || !canArchiveProject) return;
    setArchiveError(null);
    setArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: true }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        workspaceId?: string | null;
      };
      if (!res.ok) {
        setArchiveError(data.error ?? "Could not archive project.");
        setArchiving(false);
        return;
      }
      setArchiving(false);
      const workspaceId =
        typeof data.workspaceId === "string" && data.workspaceId.trim()
          ? data.workspaceId.trim()
          : "";
      if (workspaceId) {
        router.replace(riskaiPath(postArchiveNavigatePath(workspaceId)));
      } else {
        router.replace(riskaiPath("/projects"));
      }
      router.refresh();
    } catch {
      setArchiveError("Something went wrong. Try again.");
      setArchiving(false);
    }
  }, [canArchiveProject, projectId, router]);

  const currentSettingsFingerprint = useMemo(
    () => projectSettingsPersistFingerprint(form, rawNumericFields),
    [form, rawNumericFields]
  );

  const isDirty = useMemo(() => {
    if (savedBaselineFingerprint === null) return false;
    return currentSettingsFingerprint !== savedBaselineFingerprint;
  }, [currentSettingsFingerprint, savedBaselineFingerprint]);

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {!settingsReadOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
            Clear
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={settingsReadOnly || !mounted || !isDirty}
          title={
            !settingsReadOnly && mounted && !isDirty ? "No changes to save" : undefined
          }
        >
          Save
        </Button>
      </div>
    ),
    [isDirty, mounted, onSave, settingsReadOnly]
  );

  useEffect(() => {
    if (!projectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Project Settings", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, projectId, setPageHeaderExtras]);

  const readOnlyChrome = settingsReadOnly ? ` ${projectSettingsReadOnlyFieldClass}` : "";

  return (
    <main className="ds-document-page">
      {setupIncomplete ? (
        <Callout
          status="warning"
          role="status"
          className="mb-4 text-[length:var(--ds-text-sm)]"
        >
          {settingsReadOnly
            ? PROJECT_SETUP_INCOMPLETE_READONLY_NOTICE
            : PROJECT_SETUP_INCOMPLETE_EDITOR_NOTICE}
        </Callout>
      ) : settingsReadOnly ? (
        <p className="mb-4 text-[length:var(--ds-text-sm)] text-[var(--ds-text-muted)]" role="status">
          {PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE}
        </p>
      ) : null}

      <div className="ds-project-settings-tabs">
        <Tabs>
          <Tab active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
            Overview
          </Tab>
          <Tab active={activeTab === "parameters"} onClick={() => setActiveTab("parameters")}>
            Parameters
          </Tab>
          <Tab active={activeTab === "team"} onClick={() => setActiveTab("team")}>
            Team
          </Tab>
          <Tab active={activeTab === "files"} onClick={() => setActiveTab("files")}>
            Files
          </Tab>
          <Tab active={activeTab === "archive"} onClick={() => setActiveTab("archive")}>
            Archive
          </Tab>
          {canArchiveProject && (
            <Tab active={activeTab === "danger"} onClick={() => setActiveTab("danger")}>
              Danger Zone
            </Tab>
          )}
        </Tabs>
      </div>

      {activeTab === "overview" && (
        <Card className="ds-project-settings-section-card">
          <CardHeader className="ds-project-settings-card-header">
            <h2 className="ds-project-settings-card-title">Project details</h2>
          </CardHeader>
          <CardBody className="ds-project-settings-card-body">
            <div className="max-w-2xl space-y-3">
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="projectName" className="!mb-1">
                Project Name <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
              </Label>
              <input
                ref={projectNameRef}
                id="projectName"
                type="text"
                value={form.projectName}
                readOnly={settingsReadOnly}
                onChange={(e) => update("projectName", e.target.value)}
                aria-invalid={!!validation.projectName}
                className={projectSettingsInputClass(!!validation.projectName) + readOnlyChrome}
                placeholder="e.g. Northgate Rail Upgrade"
              />
              {validation.projectName ? <FieldError className="!mt-1">{validation.projectName}</FieldError> : null}
            </div>
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="projectCode" className="!mb-1">
                Project Code
              </Label>
              <input
                ref={projectCodeRef}
                id="projectCode"
                type="text"
                value={form.projectCode ?? ""}
                readOnly={settingsReadOnly}
                onChange={(e) => update("projectCode", e.target.value)}
                className={projectSettingsInputClass(false) + readOnlyChrome}
                placeholder="e.g. NGU-01"
              />
            </div>
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="location" className="!mb-1">
                Project Location <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
              </Label>
              <input
                ref={locationRef}
                id="location"
                type="text"
                value={form.location ?? ""}
                readOnly={settingsReadOnly}
                onChange={(e) => update("location", e.target.value)}
                aria-invalid={!!validation.location}
                className={projectSettingsInputClass(!!validation.location) + readOnlyChrome}
                placeholder="e.g. Sydney, NSW"
              />
              {validation.location ? <FieldError className="!mt-1">{validation.location}</FieldError> : null}
            </div>
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="projectIndustry" className="!mb-1">
                Project Industry <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
              </Label>
              <select
                ref={projectIndustryRef}
                id="projectIndustry"
                value={form.projectIndustry ?? ""}
                disabled={settingsReadOnly}
                onChange={(e) => update("projectIndustry", e.target.value)}
                aria-invalid={!!validation.projectIndustry}
                className={projectSettingsSelectClass(!!validation.projectIndustry, "sm") + readOnlyChrome}
              >
                <option value="">Select industry</option>
                {dropdownOptionsWithLegacyValue(PROJECT_INDUSTRY_VALUES, form.projectIndustry).map(
                  ({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              {validation.projectIndustry ? (
                <FieldError className="!mt-1">{validation.projectIndustry}</FieldError>
              ) : null}
            </div>
            <div className={projectSettingsFieldWidthClass("sm")}>
              <Label htmlFor="projectStage" className="!mb-1">
                Project Stage <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
              </Label>
              <select
                ref={projectStageRef}
                id="projectStage"
                value={form.projectStage ?? ""}
                disabled={settingsReadOnly}
                onChange={(e) => update("projectStage", e.target.value)}
                aria-invalid={!!validation.projectStage}
                className={projectSettingsSelectClass(!!validation.projectStage, "sm") + readOnlyChrome}
              >
                <option value="">Select stage</option>
                {dropdownOptionsWithLegacyValue(PROJECT_STAGE_VALUES, form.projectStage).map(
                  ({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              {validation.projectStage ? <FieldError className="!mt-1">{validation.projectStage}</FieldError> : null}
            </div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === "parameters" && (
        <>
          <Card className="ds-project-settings-section-card">
            <CardHeader className="ds-project-settings-card-header">
              <h2 className="ds-project-settings-card-title">Financial Context</h2>
            </CardHeader>
            <CardBody className="ds-project-settings-card-body space-y-2.5">
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="currency" className="!mb-1">
                  Project Currency <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <select
                  ref={currencyRef}
                  id="currency"
                  value={form.currency}
                  disabled={settingsReadOnly}
                  onChange={(e) => update("currency", e.target.value as ProjectCurrency)}
                  aria-invalid={!!validation.currency}
                  className={projectSettingsSelectClass(!!validation.currency, "sm") + readOnlyChrome}
                >
                  {CURRENCY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {validation.currency ? <FieldError className="!mt-1">{validation.currency}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("sm")}>
                <Label htmlFor="projectValue_input" className="!mb-1">
                  Project Value <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={projectValueRef}
                  id="projectValue_input"
                  type="text"
                  inputMode="decimal"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.projectValue_input ??
                      (form.projectValue_input === 0 ? "" : String(form.projectValue_input))) === ""
                      ? ""
                      : formatMajorCurrencyDisplay(form.projectValue_input, form.currency)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const num = Number(raw);
                    const safe = raw === "" ? 0 : (Number.isFinite(num) ? Math.max(0, num) : 0);
                    update("projectValue_input", safe, raw);
                  }}
                  aria-invalid={!!validation.projectValue_input}
                  className={projectSettingsInputClass(!!validation.projectValue_input) + readOnlyChrome}
                  placeholder="e.g. 217,000,000"
                />
                {validation.projectValue_input ? <FieldError className="!mt-1">{validation.projectValue_input}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("sm")}>
                <Label htmlFor="contingencyValue_input" className="!mb-1">
                  Project Contingency <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={contingencyValueRef}
                  id="contingencyValue_input"
                  type="text"
                  inputMode="decimal"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.contingencyValue_input ??
                      (form.contingencyValue_input === 0 ? "" : String(form.contingencyValue_input))) === ""
                      ? ""
                      : formatMajorCurrencyDisplay(form.contingencyValue_input, form.currency)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const num = Number(raw);
                    const safe = raw === "" ? 0 : (Number.isFinite(num) ? Math.max(0, num) : 0);
                    update("contingencyValue_input", safe, raw);
                  }}
                  aria-invalid={!!validation.contingencyValue_input}
                  className={projectSettingsInputClass(!!validation.contingencyValue_input) + readOnlyChrome}
                  placeholder="e.g. 22,000,000"
                />
                {validation.contingencyValue_input ? <FieldError className="!mt-1">{validation.contingencyValue_input}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("sm")}>
                <Label htmlFor="delay_cost_per_working_day" className="!mb-1">
                  Cost of Delay Per Working Day <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={delayCostPerWorkingDayRef}
                  id="delay_cost_per_working_day"
                  type="text"
                  inputMode="decimal"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.delay_cost_per_working_day ??
                      (form.delay_cost_per_working_day == null ? "" : String(form.delay_cost_per_working_day))) === ""
                      ? ""
                      : formatMajorCurrencyDisplay(form.delay_cost_per_working_day ?? 0, form.currency)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const num = Number(raw);
                    const safe =
                      raw === "" ? null : Number.isFinite(num) ? Math.max(0, num) : null;
                    update("delay_cost_per_working_day", safe, raw);
                  }}
                  aria-invalid={!!validation.delay_cost_per_working_day}
                  className={projectSettingsInputClass(!!validation.delay_cost_per_working_day) + readOnlyChrome}
                  placeholder="e.g. 50,000"
                />
                {validation.delay_cost_per_working_day ? (
                  <FieldError className="!mt-1">{validation.delay_cost_per_working_day}</FieldError>
                ) : (
                  <HelperText className="!mt-1">
                    Used to convert working-day schedule delay into indirect cost impact.
                  </HelperText>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="ds-project-settings-section-card">
            <CardHeader className="ds-project-settings-card-header">
              <h2 className="ds-project-settings-card-title">Schedule Context</h2>
            </CardHeader>
            <CardBody className="ds-project-settings-card-body space-y-2.5">
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="plannedDuration_months" className="!mb-1">
                  Planned Duration <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={plannedDurationRef}
                  id="plannedDuration_months"
                  type="text"
                  inputMode="numeric"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.plannedDuration_months ??
                      (form.plannedDuration_months === 0 ? "" : String(form.plannedDuration_months))) === ""
                      ? ""
                      : `${formatGroupedNumber(form.plannedDuration_months)} months`
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const num = Number(raw);
                    const safe = raw === "" ? 0 : (Number.isFinite(num) ? Math.max(0, Math.min(MAX_MONTHS, Math.floor(num))) : 0);
                    update("plannedDuration_months", safe, raw);
                  }}
                  aria-invalid={!!validation.plannedDuration_months}
                  className={projectSettingsNumberInputClass(!!validation.plannedDuration_months) + readOnlyChrome}
                  placeholder="e.g. 24 months"
                />
                {validation.plannedDuration_months ? <FieldError className="!mt-1">{validation.plannedDuration_months}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="workingDaysPerWeek" className="!mb-1">
                  Working Days Per Week <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <select
                  ref={workingCalendarRef}
                  id="workingDaysPerWeek"
                  value={String(form.workingDaysPerWeek)}
                  disabled={settingsReadOnly}
                  onChange={(e) => update("workingDaysPerWeek", Number(e.target.value) as WorkingDaysPerWeek)}
                  aria-invalid={!!validation.workingDaysPerWeek}
                  className={projectSettingsSelectClass(!!validation.workingDaysPerWeek, "sm") + readOnlyChrome}
                >
                  {WORKING_CALENDAR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {validation.workingDaysPerWeek ? (
                  <FieldError className="!mt-1">{validation.workingDaysPerWeek}</FieldError>
                ) : null}
              </div>
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="targetCompletionDate" className="!mb-1">
                  Target Completion Date <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={targetCompletionDateRef}
                  id="targetCompletionDate"
                  type="date"
                  value={form.targetCompletionDate}
                  readOnly={settingsReadOnly}
                  onChange={(e) => update("targetCompletionDate", e.target.value)}
                  aria-invalid={!!validation.targetCompletionDate}
                  className={projectSettingsInputClass(!!validation.targetCompletionDate) + readOnlyChrome}
                />
                {validation.targetCompletionDate ? <FieldError className="!mt-1">{validation.targetCompletionDate}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="scheduleContingency_workingDays" className="!mb-1">
                  Schedule Contingency <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={scheduleContingencyRef}
                  id="scheduleContingency_workingDays"
                  type="text"
                  inputMode="numeric"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.scheduleContingency_workingDays ??
                      (form.scheduleContingency_workingDays === 0 ? "" : String(form.scheduleContingency_workingDays))) === ""
                      ? ""
                      : `${formatGroupedNumber(form.scheduleContingency_workingDays)} working days`
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const num = Number(raw);
                    const safe =
                      raw === ""
                        ? 0
                        : (Number.isFinite(num)
                          ? Math.max(0, Math.min(MAX_SCHEDULE_CONTINGENCY_WORKING_DAYS, Math.floor(num)))
                          : 0);
                    update("scheduleContingency_workingDays", safe, raw);
                  }}
                  aria-invalid={!!validation.scheduleContingency_workingDays}
                  className={projectSettingsNumberInputClass(!!validation.scheduleContingency_workingDays) + readOnlyChrome}
                  placeholder="e.g. 20 working days"
                />
                {validation.scheduleContingency_workingDays ? (
                  <FieldError className="!mt-1">{validation.scheduleContingency_workingDays}</FieldError>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card className="ds-project-settings-section-card">
            <CardHeader className="ds-project-settings-card-header">
              <h2 className="ds-project-settings-card-title">Risk Appetite</h2>
            </CardHeader>
            <CardBody className="ds-project-settings-card-body">
              <div className={projectSettingsFieldWidthClass("xsm")}>
                <Label htmlFor="riskAppetite" className="!mb-1">
                  Risk Appetite <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <select
                  ref={riskAppetiteRef}
                  id="riskAppetite"
                  value={form.riskAppetite}
                  disabled={settingsReadOnly}
                  onChange={(e) => update("riskAppetite", e.target.value as RiskAppetite)}
                  aria-invalid={!!validation.riskAppetite}
                  className={projectSettingsSelectClass(!!validation.riskAppetite, "sm") + readOnlyChrome}
                >
                  {RISK_APPETITE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {validation.riskAppetite ? <FieldError className="!mt-1">{validation.riskAppetite}</FieldError> : null}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {activeTab === "team" &&
        (projectId ? (
          <ProjectMembersSection projectId={projectId} />
        ) : (
          <EmptyState className="mb-4" message="Project members are available once a project is selected." />
        ))}

      {activeTab === "files" &&
        (riskUiReadOnly ? (
          <EmptyState className="mb-4" message="You have view-only access. File uploads are available to editors." />
        ) : (
          <ProjectExcelUploadSection />
        ))}

      {activeTab === "archive" && (
        <Card className="ds-project-settings-section-card">
          <CardHeader className="ds-project-settings-card-header">
            <h2 className="ds-project-settings-card-title">Register of archived risks</h2>
          </CardHeader>
          <CardBody className="ds-project-settings-card-body">
            <HelperText className="!mb-2 !mt-0">Review archived risks one by one (Previous / Next) in the detail modal.</HelperText>
            {archivedRisks.length > 0 ? (
              <div className="-mx-1 overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Risk #</TableHeaderCell>
                      <TableHeaderCell>Title</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {archivedRisks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell>{risk.riskNumber ?? "—"}</TableCell>
                        <TableCell className="text-[var(--ds-text-primary)]">{risk.title || "Untitled risk"}</TableCell>
                        <TableCell className="capitalize text-[var(--ds-text-secondary)]">{risk.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState message="No archived risks yet." />
            )}
            <div className="mt-3">
              <Button type="button" variant="secondary" onClick={() => setShowArchivedReviewModal(true)} disabled={archivedRisks.length === 0}>
                Review archived risks
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === "danger" && canArchiveProject && (
        <Card className="ds-project-settings-section-card">
          <CardHeader className="ds-project-settings-card-header">
            <h2 className="ds-project-settings-card-title text-[var(--ds-status-danger-fg)]">Danger Zone</h2>
          </CardHeader>
          <CardBody className="ds-project-settings-card-body">
            <p className="mb-3 text-sm text-[var(--ds-text-secondary)]">
              Archive this project. It is removed from active Workspace views, but all project data
              is kept and can be restored later.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setArchiveError(null);
                setArchiveOpen(true);
              }}
              className="border-[var(--ds-status-danger-border)] text-[var(--ds-status-danger-fg)] hover:border-[var(--ds-status-danger-border)] hover:bg-[var(--ds-status-danger-bg)]"
            >
              Archive project
            </Button>
          </CardBody>
        </Card>
      )}

      {saveError && (
        <Callout
          status="danger"
          className="mt-3 !border-[var(--ds-border-subtle)] !px-3 !py-2"
          role="alert"
        >
          <span className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
            Could not save settings: {saveError}
          </span>
        </Callout>
      )}

      {saved && (
        <Callout
          status="success"
          className="mt-3 !border-[var(--ds-border-subtle)] !px-3 !py-2"
          role="status"
        >
          <span className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-secondary)]">
            Saved ✓ Settings updated.{" "}
            <Link
              href={riskRegisterHref}
              className="font-medium text-[var(--ds-status-success-subtle-fg)] underline underline-offset-2 hover:no-underline"
            >
              Continue to Risk Register →
            </Link>
          </span>
        </Callout>
      )}

      {showClearConfirm && (
        <div
          className="ds-modal-backdrop z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
        >
          <Card className="max-w-sm shadow-[var(--ds-shadow-sm)]">
            <CardBody className="!p-5">
              <h2
                id="clear-dialog-title"
                className="mb-2 text-sm font-semibold text-[var(--ds-text-primary)]"
              >
                Clear settings?
              </h2>
              <p className="mb-4 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
                This will reset the form and remove saved data from this device.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="!border-[var(--ds-status-danger-strong-border)] !bg-[var(--ds-status-danger)] !text-[var(--ds-text-inverse)] hover:!brightness-110"
                  onClick={onClear}
                >
                  Clear
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {archiveOpen && canArchiveProject ? (
        <div
          className="ds-modal-backdrop z-[120]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-project-title"
          aria-describedby="archive-project-desc"
          onClick={() => !archiving && setArchiveOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--ds-radius-md)] border border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)] bg-[var(--ds-surface-elevated)] p-6 shadow-xl dark:border-[color-mix(in_oklab,var(--ds-border)_90%,transparent)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="archive-project-title"
              className="text-lg font-semibold tracking-tight text-[var(--ds-text-primary)]"
            >
              Archive project?
            </h3>
            <p id="archive-project-desc" className="mt-2 text-sm text-[var(--ds-text-secondary)]">
              {form.projectName.trim() ? `"${form.projectName.trim()}"` : "This project"} will be
              removed from active Workspace views. Its data is kept and can be restored later.
            </p>
            {archiveError && (
              <Callout status="danger" role="alert" className="mt-3 text-[length:var(--ds-text-sm)] leading-relaxed">
                {archiveError}
              </Callout>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={archiving}
                onClick={() => setArchiveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={archiving}
                onClick={() => void confirmArchiveProject()}
                className="bg-[var(--ds-status-danger-strong-bg)] text-[var(--ds-status-danger-strong-fg)] shadow-none hover:bg-[var(--ds-status-danger-strong-bg)] hover:opacity-90"
              >
                {archiving ? "Archiving…" : "Yes, archive this project"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {projectId && (
        <RiskRegisterLookupProviders
          projectId={projectId}
          extraOwnerNamesFromRisks={extraOwnerNamesFromRisks}
        >
          <RiskDetailModal
            open={showArchivedReviewModal}
            risks={archivedRisks}
            initialRiskId={archivedRisks[0]?.id ?? null}
            readOnly={riskUiReadOnly}
            onClose={() => setShowArchivedReviewModal(false)}
            onSave={(risk) => updateRisk(risk.id, risk)}
            onRestoreRisk={
              riskUiReadOnly ? undefined : (id) => restoreArchivedRisk(id)
            }
          />
        </RiskRegisterLookupProviders>
      )}
    </main>
  );
}
