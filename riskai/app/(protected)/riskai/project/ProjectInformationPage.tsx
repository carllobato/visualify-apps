"use client";

/**
 * Project Settings page: define baseline project context used to interpret risk outputs.
 * With a project selected: load `visualify_project_settings` first, then localStorage fallback;
 * save upserts to Supabase (RLS) and mirrors to localStorage (`riskai_project_context_v1`).
 * Legacy (no project): localStorage only. Optional: POST /api/project-context.
 */

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ProjectContext,
  type RiskAppetite,
  type ProjectCurrency,
  loadProjectContext,
  saveProjectContext,
  clearProjectContext,
  parseProjectContext,
  parseProjectContextFromVisualifyProjectSettingsRow,
  getContingencyPercent,
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
import { DASHBOARD_PATH, riskaiPath } from "@/lib/routes";
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
import { PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE } from "@/lib/settings/settingsPermissionMessages";

const RISK_APPETITE_OPTIONS: { value: RiskAppetite; label: string }[] = [
  { value: "P10", label: "P10" },
  { value: "P20", label: "P20" },
  { value: "P30", label: "P30" },
  { value: "P40", label: "P40" },
  { value: "P50", label: "P50" },
  { value: "P60", label: "P60" },
  { value: "P70", label: "P70" },
  { value: "P80", label: "P80" },
  { value: "P90", label: "P90" },
];

const CURRENCY_OPTIONS: { value: ProjectCurrency; label: string }[] = [
  { value: "AUD", label: "AUD" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
];

const MAX_MONTHS = 600;
const MAX_WEEKS = 520;

const REQUIRED_NUMERIC_KEYS = [
  "contingencyValue_input",
  "plannedDuration_months",
  "scheduleContingency_weeks",
] as const;

type RawNumericFields = Partial<
  Record<(typeof REQUIRED_NUMERIC_KEYS)[number] | "delay_cost_per_day", string>
>;

function defaultContext(): ProjectContext {
  return {
    projectName: "",
    location: "",
    plannedDuration_months: 0,
    targetCompletionDate: "",
    scheduleContingency_weeks: 0,
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
  };
}

function getValidationErrors(
  form: ProjectContext,
  rawNumeric: RawNumericFields
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!form.projectName.trim()) err.projectName = "This field is required";
  if (form.projectValue_input <= 0)
    err.projectValue_input = form.projectValue_input < 0 ? "Enter a valid number" : "This field is required";
  const rawCv = rawNumeric.contingencyValue_input ?? (form.contingencyValue_input === 0 ? "" : String(form.contingencyValue_input));
  if (rawCv === "") err.contingencyValue_input = "This field is required";
  else {
    const n = Number(rawCv);
    if (Number.isNaN(n) || n < 0) err.contingencyValue_input = "Enter a valid number";
  }
  const rawDelay =
    rawNumeric.delay_cost_per_day ??
    (form.delay_cost_per_day == null ? "" : String(form.delay_cost_per_day));
  if (rawDelay !== "") {
    const n = Number(rawDelay);
    if (Number.isNaN(n) || n < 0) err.delay_cost_per_day = "Enter a valid number";
  }
  const rawDur = rawNumeric.plannedDuration_months ?? (form.plannedDuration_months === 0 ? "" : String(form.plannedDuration_months));
  if (rawDur === "") err.plannedDuration_months = "This field is required";
  else {
    const n = Number(rawDur);
    if (Number.isNaN(n) || n < 0) err.plannedDuration_months = "Enter a valid number";
    else if (n > MAX_MONTHS) err.plannedDuration_months = `Duration must be between 0 and ${MAX_MONTHS} months.`;
  }
  if (!form.targetCompletionDate.trim()) err.targetCompletionDate = "This field is required";
  const rawSc = rawNumeric.scheduleContingency_weeks ?? (form.scheduleContingency_weeks === 0 ? "" : String(form.scheduleContingency_weeks));
  if (rawSc === "") err.scheduleContingency_weeks = "This field is required";
  else {
    const n = Number(rawSc);
    if (Number.isNaN(n) || n < 0) err.scheduleContingency_weeks = "Enter a valid number";
    else if (n > MAX_WEEKS) err.scheduleContingency_weeks = `Schedule contingency must be between 0 and ${MAX_WEEKS} weeks.`;
  }
  return err;
}

const FIRST_INVALID_FIELD_ORDER = [
  "projectName",
  "projectValue_input",
  "contingencyValue_input",
  "plannedDuration_months",
  "targetCompletionDate",
  "scheduleContingency_weeks",
] as const;

const FIELD_TAB_MAP: Partial<Record<(typeof FIRST_INVALID_FIELD_ORDER)[number], ProjectSettingsTab>> = {
  projectName: "overview",
  projectValue_input: "parameters",
  contingencyValue_input: "parameters",
  plannedDuration_months: "parameters",
  targetCompletionDate: "parameters",
  scheduleContingency_weeks: "parameters",
};

const SAVED_CONFIRM_AUTO_HIDE_MS = 3000;

function formatGroupedNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(value);
}

/** Whole-currency display for project value, contingency, and delay (major units; no k/m/b scaling). */
function formatMajorCurrencyDisplay(amount: number, currency: ProjectCurrency): string {
  const sym = currency === "GBP" ? "£" : "$";
  return `${sym} ${formatGroupedNumber(amount)}`;
}

function rawNumericFieldsFromContext(stored: ProjectContext): RawNumericFields {
  return {
    contingencyValue_input: stored.contingencyValue_input === 0 ? "" : String(stored.contingencyValue_input),
    plannedDuration_months: stored.plannedDuration_months === 0 ? "" : String(stored.plannedDuration_months),
    scheduleContingency_weeks: stored.scheduleContingency_weeks === 0 ? "" : String(stored.scheduleContingency_weeks),
    delay_cost_per_day: stored.delay_cost_per_day == null ? "" : String(stored.delay_cost_per_day),
  };
}

export type ProjectInformationPageProps = { projectId?: string | null };
type ProjectSettingsTab = "overview" | "parameters" | "team" | "files" | "archive";

export default function ProjectInformationPage({ projectId }: ProjectInformationPageProps = {}) {
  const projectPermissions = useProjectPermissions();
  const setPageHeaderExtras = useOptionalPageHeaderExtras()?.setExtras;
  const settingsReadOnly =
    Boolean(projectId) &&
    (projectPermissions == null || !projectPermissions.canEditProjectMetadata);
  const riskUiReadOnly =
    Boolean(projectId) &&
    (projectPermissions == null || !projectPermissions.canEditContent);

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<ProjectContext>(defaultContext());
  const [rawNumericFields, setRawNumericFields] = useState<RawNumericFields>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showArchivedReviewModal, setShowArchivedReviewModal] = useState(false);
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
  const projectValueRef = useRef<HTMLInputElement>(null);
  const contingencyValueRef = useRef<HTMLInputElement>(null);
  const plannedDurationRef = useRef<HTMLInputElement>(null);
  const targetCompletionDateRef = useRef<HTMLInputElement>(null);
  const scheduleContingencyRef = useRef<HTMLInputElement>(null);
  const delayCostPerDayRef = useRef<HTMLInputElement>(null);
  const fieldRefsRef = useRef<Record<string, RefObject<HTMLInputElement | null>>>({
    projectName: projectNameRef,
    projectValue_input: projectValueRef,
    contingencyValue_input: contingencyValueRef,
    delay_cost_per_day: delayCostPerDayRef,
    plannedDuration_months: plannedDurationRef,
    targetCompletionDate: targetCompletionDateRef,
    scheduleContingency_weeks: scheduleContingencyRef,
  });

  const riskRegisterHref = projectId ? riskaiPath(`/projects/${projectId}/risks`) : DASHBOARD_PATH;

  useEffect(() => {
    let cancelled = false;
    const trimmedProjectId = projectId?.trim();

    if (!trimmedProjectId) {
      const stored = loadProjectContext(projectId ?? undefined);
      if (stored) {
        setForm(stored);
        setRawNumericFields(rawNumericFieldsFromContext(stored));
      }
      setMounted(true);
      return;
    }

    void (async () => {
      const supabase = supabaseBrowserClient();
      const { data: row, error } = await supabase
        .from("visualify_project_settings")
        .select("*")
        .eq("project_id", trimmedProjectId)
        .maybeSingle();

      if (cancelled) return;

      let skipApiProjectName = false;
      let hydrated = false;

      if (!error && row && typeof row === "object") {
        const parsed = parseProjectContextFromVisualifyProjectSettingsRow(row as Record<string, unknown>);
        if (parsed) {
          setForm(parsed);
          setRawNumericFields(rawNumericFieldsFromContext(parsed));
          hydrated = true;
          if (parsed.projectName.trim().length > 0) {
            skipApiProjectName = true;
          }
        }
      }

      if (!hydrated) {
        const stored = loadProjectContext(trimmedProjectId);
        if (stored) {
          setForm(stored);
          setRawNumericFields(rawNumericFieldsFromContext(stored));
        }
      }

      if (cancelled) return;

      if (!skipApiProjectName) {
        try {
          const res = await fetch(`/api/projects/${trimmedProjectId}`, { credentials: "include" });
          const data: { name?: string } | null = res.ok ? await res.json() : null;
          if (cancelled) return;
          if (data && typeof data.name === "string") {
            setForm((prev) => ({ ...prev, projectName: data.name as string }));
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) setMounted(true);
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
        if (key === "projectValue_input" || key === "contingencyValue_input") {
          next.projectValue_m = pvInput / 1e6;
          next.contingencyValue_m = cvInput / 1e6;
          next.approvedBudget_m = next.projectValue_m + next.contingencyValue_m;
        }
        return next;
      });
      if (
        raw !== undefined &&
        (REQUIRED_NUMERIC_KEYS.includes(key as (typeof REQUIRED_NUMERIC_KEYS)[number]) ||
          key === "delay_cost_per_day")
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
    const err = getValidationErrors(form, rawNumericFields);
    setValidation(err);
    if (Object.keys(err).length > 0) {
      const firstKey = FIRST_INVALID_FIELD_ORDER.find((k) => err[k]);
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
      const supabase = supabaseBrowserClient();
      const { error: settingsErr } = await supabase.from("visualify_project_settings").upsert(
        {
          project_id: projectId,
          project_name: toSave.projectName,
          location: toSave.location?.trim() ? toSave.location.trim() : null,
          currency: toSave.currency,
          financial_unit: "MILLIONS",
          financial_inputs_version: 2,
          project_value_input: toSave.projectValue_input,
          contingency_value_input: toSave.contingencyValue_input,
          planned_duration_months: toSave.plannedDuration_months,
          target_completion_date: toSave.targetCompletionDate,
          schedule_contingency_weeks: toSave.scheduleContingency_weeks,
          risk_appetite: toSave.riskAppetite,
          delay_cost_per_day: toSave.delay_cost_per_day,
        },
        { onConflict: "project_id" }
      );
      if (settingsErr) {
        setSaveError(settingsErr.message);
        return;
      }
    }

    const okLs = saveProjectContext(toSave, projectId ?? undefined);
    if (!projectId && !okLs) {
      return;
    }

    setForm(toSave);
    setRawNumericFields({
      contingencyValue_input: toSave.contingencyValue_input === 0 ? "" : String(toSave.contingencyValue_input),
      plannedDuration_months: toSave.plannedDuration_months === 0 ? "" : String(toSave.plannedDuration_months),
      scheduleContingency_weeks: toSave.scheduleContingency_weeks === 0 ? "" : String(toSave.scheduleContingency_weeks),
      delay_cost_per_day: toSave.delay_cost_per_day == null ? "" : String(toSave.delay_cost_per_day),
    });
    setSaved(true);
    if (savedHideTimeoutRef.current) clearTimeout(savedHideTimeoutRef.current);
    savedHideTimeoutRef.current = setTimeout(() => {
      setSaved(false);
      savedHideTimeoutRef.current = null;
    }, SAVED_CONFIRM_AUTO_HIDE_MS);
    fetch("/api/project-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSave),
    }).catch(() => {});
    if (projectId) {
      fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toSave.projectName }),
        credentials: "include",
      })
        .then((res) => { if (res.ok) router.refresh(); })
        .catch(() => {});
    }
  }, [activeTab, form, rawNumericFields, projectId, router, settingsReadOnly]);

  const onClear = useCallback(() => {
    if (settingsReadOnly) return;
    setShowClearConfirm(false);
    clearProjectContext(projectId ?? undefined);
    setForm(defaultContext());
    setRawNumericFields({});
    setSaved(false);
    setSaveError(null);
    setValidation({});
  }, [projectId, settingsReadOnly]);

  const contingencyPct = getContingencyPercent(form);
  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        {!settingsReadOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
            Clear
          </Button>
        )}
        <Button type="button" variant="primary" onClick={onSave} disabled={settingsReadOnly}>
          Save
        </Button>
      </div>
    ),
    [onSave, settingsReadOnly]
  );

  useEffect(() => {
    if (!projectId || !setPageHeaderExtras) return;
    setPageHeaderExtras({ titleSuffix: "Project Settings", end: headerActions });
    return () => setPageHeaderExtras(null);
  }, [headerActions, projectId, setPageHeaderExtras]);

  const readOnlyChrome = settingsReadOnly ? ` ${projectSettingsReadOnlyFieldClass}` : "";

  return (
    <main className="ds-document-page">
      {settingsReadOnly && (
        <Callout
          status="info"
          className="mb-4 !px-3 !py-2 text-[length:var(--ds-text-sm)]"
          role="status"
        >
          {PROJECT_SETTINGS_METADATA_VIEW_ONLY_NOTICE}
        </Callout>
      )}

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
                Name <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
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
              <Label htmlFor="location" className="!mb-1">
                Location (optional)
              </Label>
              <input
                id="location"
                type="text"
                value={form.location ?? ""}
                readOnly={settingsReadOnly}
                onChange={(e) => update("location", e.target.value)}
                className={projectSettingsInputClass(false) + readOnlyChrome}
                placeholder="e.g. Sydney, NSW"
              />
            </div>
            <div className={projectSettingsFieldWidthClass("xsm")}>
              <Label htmlFor="currency" className="!mb-1">
                Currency
              </Label>
              <select
                id="currency"
                value={form.currency}
                disabled={settingsReadOnly}
                onChange={(e) => update("currency", e.target.value as ProjectCurrency)}
                className={projectSettingsSelectClass(false, "sm") + readOnlyChrome}
                aria-label="Currency"
              >
                {CURRENCY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
                    form.projectValue_input === 0
                      ? ""
                      : formatMajorCurrencyDisplay(form.projectValue_input, form.currency)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const num = Number(raw);
                    update("projectValue_input", raw === "" ? 0 : (Number.isFinite(num) ? Math.max(0, num) : 0));
                  }}
                  aria-invalid={!!validation.projectValue_input}
                  className={projectSettingsInputClass(!!validation.projectValue_input) + readOnlyChrome}
                  placeholder="e.g. 217,000,000"
                />
                {validation.projectValue_input ? <FieldError className="!mt-1">{validation.projectValue_input}</FieldError> : null}
              </div>
              <div className={projectSettingsFieldWidthClass("sm")}>
                <Label htmlFor="contingencyValue_input" className="!mb-1">
                  Contingency Value <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
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
                <Label htmlFor="delay_cost_per_day" className="!mb-1">
                  Delay Cost Per Day
                </Label>
                <input
                  ref={delayCostPerDayRef}
                  id="delay_cost_per_day"
                  type="text"
                  inputMode="decimal"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.delay_cost_per_day ??
                      (form.delay_cost_per_day == null ? "" : String(form.delay_cost_per_day))) === ""
                      ? ""
                      : formatMajorCurrencyDisplay(form.delay_cost_per_day ?? 0, form.currency)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    const num = Number(raw);
                    const safe =
                      raw === "" ? null : Number.isFinite(num) ? Math.max(0, num) : null;
                    update("delay_cost_per_day", safe, raw);
                  }}
                  aria-invalid={!!validation.delay_cost_per_day}
                  className={projectSettingsInputClass(!!validation.delay_cost_per_day) + readOnlyChrome}
                  placeholder="e.g. 50,000"
                />
                {validation.delay_cost_per_day ? (
                  <FieldError className="!mt-1">{validation.delay_cost_per_day}</FieldError>
                ) : (
                  <HelperText className="!mt-1">
                    Used to convert schedule delay into indirect cost impact.
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
                  Planned duration <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
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
                <Label htmlFor="targetCompletionDate" className="!mb-1">
                  Target completion date <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
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
                <Label htmlFor="scheduleContingency_weeks" className="!mb-1">
                  Schedule contingency <span className="text-[var(--ds-status-danger-fg)]" aria-hidden>*</span>
                </Label>
                <input
                  ref={scheduleContingencyRef}
                  id="scheduleContingency_weeks"
                  type="text"
                  inputMode="numeric"
                  readOnly={settingsReadOnly}
                  value={
                    (rawNumericFields.scheduleContingency_weeks ??
                      (form.scheduleContingency_weeks === 0 ? "" : String(form.scheduleContingency_weeks))) === ""
                      ? ""
                      : `${formatGroupedNumber(form.scheduleContingency_weeks)} weeks`
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    const num = Number(raw);
                    const safe = raw === "" ? 0 : (Number.isFinite(num) ? Math.max(0, Math.min(MAX_WEEKS, Math.floor(num))) : 0);
                    update("scheduleContingency_weeks", safe, raw);
                  }}
                  aria-invalid={!!validation.scheduleContingency_weeks}
                  className={projectSettingsNumberInputClass(!!validation.scheduleContingency_weeks) + readOnlyChrome}
                  placeholder="e.g. 4 weeks"
                />
                {validation.scheduleContingency_weeks ? <FieldError className="!mt-1">{validation.scheduleContingency_weeks}</FieldError> : null}
              </div>
            </CardBody>
          </Card>

          <Card className="ds-project-settings-section-card">
            <CardHeader className="ds-project-settings-card-header">
              <h2 className="ds-project-settings-card-title">Risk Appetite</h2>
            </CardHeader>
            <CardBody className="ds-project-settings-card-body">
              <div className={projectSettingsFieldWidthClass("md")}>
                <div className="ds-segmented-control" role="radiogroup" aria-label="Risk appetite">
                  {RISK_APPETITE_OPTIONS.map(({ value, label }) => {
                    const active = form.riskAppetite === value;
                    return (
                      <Button
                        key={value}
                        type="button"
                        variant={active ? "primary" : "ghost"}
                        size="sm"
                        disabled={settingsReadOnly}
                        onClick={() => update("riskAppetite", value)}
                        role="radio"
                        aria-checked={active}
                        className="ds-segmented-control__segment"
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
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
