"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_INDUSTRY_VALUES,
  PROJECT_STAGE_VALUES,
  RISK_APPETITE_VALUES,
  WORKING_DAYS_PER_WEEK_VALUES,
  type ProjectCurrency,
  type RiskAppetite,
  type WorkingDaysPerWeek,
} from "@/lib/projectContext";
import { Callout } from "@visualify/design-system";
import {
  createProjectRequestFromForm,
  projectCreateSelectorVisibility,
  resolveProjectCreateFormParent,
} from "@/lib/project/resolveWorkspaceProjectCreateParent";
import {
  firstOnboardingFormError,
  firstOnboardingStepError,
  onboardingCanonicalProjectPatchBody,
  onboardingReportedComplete,
  parseOnboardingProjectContext,
  sanitizeOnboardingNumericInput,
  validateOnboardingProjectForm,
  type OnboardingProjectFormValues,
} from "@/lib/project/onboardingCanonicalProjectWrite";
import {
  OnboardingStepLabel,
  PROJECT_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  workspaceId?: string | null;
  initialStep?: CreateStep;
  onCreated: (project: { id: string; name: string }) => void | Promise<void>;
  onDismiss: () => void;
};

type CreateStep = 1 | 2 | 3 | 4 | 5;
type WorkspaceRow = { id: string; name: string; slug: string };

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function parseIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) return "dd/mm/yyyy";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export function ProjectOnboardingCreateModal({
  open,
  workspaceId = null,
  initialStep = 1,
  onCreated,
  onDismiss,
}: Props) {
  function sanitizeNumericInput(value: string): string {
    return sanitizeOnboardingNumericInput(value);
  }

  function formatNumericInput(value: string): string {
    const sanitized = sanitizeNumericInput(value);
    if (!sanitized) return "";
    const hasTrailingDot = sanitized.endsWith(".");
    const [rawWhole, rawDecimal = ""] = sanitized.split(".");
    const whole = rawWhole.replace(/^0+(?=\d)/, "") || "0";
    const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (hasTrailingDot) return `${groupedWhole}.`;
    if (rawDecimal.length > 0) return `${groupedWhole}.${rawDecimal}`;
    return groupedWhole;
  }

  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [location, setLocation] = useState("");
  const [projectIndustry, setProjectIndustry] = useState("");
  const [projectStage, setProjectStage] = useState("");
  const [currency, setCurrency] = useState<ProjectCurrency>("AUD");
  const [projectValueInput, setProjectValueInput] = useState("");
  const [contingencyValueInput, setContingencyValueInput] = useState("");
  const [delayCostPerWorkingDayInput, setDelayCostPerWorkingDayInput] = useState("");
  const [plannedDurationMonths, setPlannedDurationMonths] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<WorkingDaysPerWeek>(5);
  const [scheduleContingencyWorkingDays, setScheduleContingencyWorkingDays] = useState("");
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>("P80");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorCallout, setShowErrorCallout] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[] | null>(null);
  const [workspacesLoadError, setWorkspacesLoadError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const skipNextErrorAutoClearRef = useRef(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setName("");
    setProjectCode("");
    setLocation("");
    setProjectIndustry("");
    setProjectStage("");
    setCurrency("AUD");
    setProjectValueInput("");
    setContingencyValueInput("");
    setDelayCostPerWorkingDayInput("");
    setPlannedDurationMonths("");
    setTargetCompletionDate("");
    setCalendarOpen(false);
    setCalendarMonth(new Date());
    setWorkingDaysPerWeek(5);
    setScheduleContingencyWorkingDays("");
    setRiskAppetite("P80");
    setError(null);
    setShowErrorCallout(false);
    setWorkspaces(null);
    setWorkspacesLoadError(null);
    setSelectedWorkspaceId("");
  }, [open, workspaceId, initialStep]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const workspacesRes = await fetch("/api/workspaces/creatable", {
          cache: "no-store",
          credentials: "include",
        });
        const workspacesJson = (await workspacesRes.json().catch(() => ({}))) as {
          workspaces?: WorkspaceRow[];
          error?: string;
        };
        if (cancelled) return;

        if (!workspacesRes.ok) {
          setWorkspacesLoadError(workspacesJson.error?.trim() || "Could not load workspaces.");
          setWorkspaces([]);
        } else {
          setWorkspaces(Array.isArray(workspacesJson.workspaces) ? workspacesJson.workspaces : []);
          setWorkspacesLoadError(null);
        }

        const wsList = Array.isArray(workspacesJson.workspaces) ? workspacesJson.workspaces : [];
        const parent = resolveProjectCreateFormParent({
          preferredWorkspaceId: workspaceId,
          workspaces: wsList,
        });
        setSelectedWorkspaceId(parent.selectedWorkspaceId);
      } catch {
        if (!cancelled) {
          setWorkspacesLoadError("Could not load workspaces.");
          setWorkspaces([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  useEffect(() => {
    if (!showErrorCallout) return;
    if (skipNextErrorAutoClearRef.current) {
      skipNextErrorAutoClearRef.current = false;
      return;
    }
    setError(null);
    setShowErrorCallout(false);
  }, [
    name,
    projectCode,
    location,
    projectIndustry,
    projectStage,
    currency,
    projectValueInput,
    contingencyValueInput,
    delayCostPerWorkingDayInput,
    plannedDurationMonths,
    targetCompletionDate,
    workingDaysPerWeek,
    scheduleContingencyWorkingDays,
    riskAppetite,
    selectedWorkspaceId,
  ]);

  useEffect(() => {
    setError(null);
    setShowErrorCallout(false);
  }, [step]);

  useEffect(() => {
    if (!calendarOpen) return;

    function updateCalendarPosition() {
      const trigger = calendarTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const desiredWidth = Math.min(320, rect.width);
      const nextLeft = Math.max(16, Math.min(rect.left, window.innerWidth - desiredWidth - 16));
      const nextTop = rect.bottom + 6;
      setCalendarPosition({ top: nextTop, left: nextLeft });
    }

    updateCalendarPosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = calendarRef.current?.contains(target);
      const clickedPopover = calendarPopoverRef.current?.contains(target);
      if (!clickedTrigger && !clickedPopover) {
        setCalendarOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }
    function handleViewportChange() {
      updateCalendarPosition();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [calendarOpen]);

  if (!open) return null;

  function collectFormValues(): OnboardingProjectFormValues {
    return {
      projectName: name,
      projectCode,
      location,
      projectIndustry,
      projectStage,
      currency,
      projectValueRaw: projectValueInput,
      contingencyValueRaw: contingencyValueInput,
      delayCostPerWorkingDayRaw: delayCostPerWorkingDayInput,
      plannedDurationMonthsRaw: plannedDurationMonths,
      targetCompletionDate,
      workingDaysPerWeek,
      scheduleContingencyWorkingDaysRaw: scheduleContingencyWorkingDays,
      riskAppetite,
    };
  }

  function validateStep(current: CreateStep): boolean {
    const formParent = resolveProjectCreateFormParent({
      preferredWorkspaceId: workspaceId,
      workspaces: workspaces ?? [],
    });
    if (formParent.preferredWorkspaceDenied) {
      setError("You do not have permission to create a project in this workspace.");
      return false;
    }

    const workspaceReady =
      selectedWorkspaceId.trim() ||
      formParent.selectedWorkspaceId ||
      ((workspaces ?? []).length === 1 ? (workspaces ?? [])[0]!.id : "");
    if (!workspaceReady) {
      setError("Select a workspace.");
      return false;
    }
    const stepError = firstOnboardingStepError(current, validateOnboardingProjectForm(collectFormValues()));
    if (stepError) {
      setError(stepError);
      return false;
    }
    return true;
  }

  function handleStepContinue() {
    skipNextErrorAutoClearRef.current = true;
    setShowErrorCallout(true);
    setError(null);
    if (!validateStep(step)) {
      skipNextErrorAutoClearRef.current = false;
      return;
    }
    setShowErrorCallout(false);
    setStep((prev) => Math.min(5, prev + 1) as CreateStep);
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    skipNextErrorAutoClearRef.current = true;
    setShowErrorCallout(true);
    setError(null);
    if (!validateStep(5)) {
      skipNextErrorAutoClearRef.current = false;
      return;
    }
    const formValues = collectFormValues();
    const formError = firstOnboardingFormError(validateOnboardingProjectForm(formValues));
    if (formError) {
      skipNextErrorAutoClearRef.current = false;
      setError(formError);
      return;
    }
    const parsed = parseOnboardingProjectContext(formValues);
    if (!parsed) {
      skipNextErrorAutoClearRef.current = false;
      setError("Check the project details and try again.");
      return;
    }
    const trimmed = parsed.projectName;

    setCreating(true);
    try {
      const formParent = resolveProjectCreateFormParent({
        preferredWorkspaceId: workspaceId,
        workspaces: workspaces ?? [],
      });
      const resolvedWorkspaceId =
        selectedWorkspaceId.trim() ||
        formParent.selectedWorkspaceId ||
        ((workspaces ?? []).length === 1 ? (workspaces ?? [])[0]!.id : "");
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify(
          createProjectRequestFromForm({
            name: trimmed,
            resolvedWorkspaceId,
          }),
        ),
      });
      const json = (await res.json().catch(() => ({}))) as {
        project?: { id: string; name: string };
        error?: string;
      };
      if (!res.ok || !json.project?.id) {
        if (res.status === 401) {
          skipNextErrorAutoClearRef.current = false;
          setError("Your session expired. Please refresh this page and sign in again.");
          if (typeof window !== "undefined") {
            window.setTimeout(() => {
              window.location.assign("/login");
            }, 300);
          }
          return;
        }
        skipNextErrorAutoClearRef.current = false;
        setError(
          json.error?.trim() ||
            "Could not create project."
        );
        return;
      }
      const canonicalRes = await fetch(`/api/projects/${json.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(onboardingCanonicalProjectPatchBody(parsed)),
      });
      const canonicalJson = (await canonicalRes.json().catch(() => ({}))) as { error?: string };
      if (!canonicalRes.ok) {
        if (canonicalRes.status === 401) {
          skipNextErrorAutoClearRef.current = false;
          setError(
            "Project was created, but your session expired before project details were saved. Please refresh and sign in again."
          );
          if (typeof window !== "undefined") {
            window.setTimeout(() => {
              window.location.assign("/login");
            }, 300);
          }
          return;
        }
        skipNextErrorAutoClearRef.current = false;
        setError(
          canonicalJson.error?.trim() ||
            "Project was created but project details could not be saved."
        );
        return;
      }
      if (!onboardingReportedComplete({ canonicalOk: canonicalRes.ok })) {
        skipNextErrorAutoClearRef.current = false;
        setError("Project was created but project details could not be saved.");
        return;
      }
      await onCreated({ id: json.project.id, name: trimmed });
    } catch {
      skipNextErrorAutoClearRef.current = false;
      setError("Something went wrong while creating the project. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const today = new Date();
  const visibleMonthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const visibleMonthLabel = visibleMonthStart.toLocaleString("en-AU", {
    month: "long",
    year: "numeric",
  });
  const selectedDate = parseIsoDate(targetCompletionDate);
  const monthStartWeekday = (visibleMonthStart.getDay() + 6) % 7;
  const gridStartDate = new Date(
    visibleMonthStart.getFullYear(),
    visibleMonthStart.getMonth(),
    1 - monthStartWeekday
  );
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStartDate.getFullYear(), gridStartDate.getMonth(), gridStartDate.getDate() + index);
    return {
      date,
      iso: formatIsoDate(date),
      inMonth: date.getMonth() === visibleMonthStart.getMonth(),
      isToday: formatIsoDate(date) === formatIsoDate(today),
      isSelected: selectedDate ? formatIsoDate(date) === formatIsoDate(selectedDate) : false,
    };
  });

  const scopesLoading = workspaces === null;
  const scopeLoadError = workspacesLoadError;

  if (scopesLoading) {
    return (
      <div
        className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[104]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-onboarding-create-title"
      >
        <div className="ds-onboarding-modal-panel flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
          <div className="ds-onboarding-modal-scroll-area">
            <div className="ds-onboarding-modal-panel-header">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id="project-onboarding-create-title" className="ds-onboarding-modal-title">
                  Create project
                </h2>
              </div>
              <button
                type="button"
                className="ds-onboarding-modal-close"
                onClick={onDismiss}
                aria-label="Close"
              >
                <OnboardingModalCloseIcon />
              </button>
            </div>
            <p className="ds-onboarding-modal-lede">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (scopeLoadError) {
    return (
      <div
        className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[104]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-onboarding-create-title"
      >
        <div className="ds-onboarding-modal-panel flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
          <div className="ds-onboarding-modal-scroll-area">
            <div className="ds-onboarding-modal-panel-header">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id="project-onboarding-create-title" className="ds-onboarding-modal-title">
                  Create project
                </h2>
              </div>
              <button
                type="button"
                className="ds-onboarding-modal-close"
                onClick={onDismiss}
                aria-label="Close"
              >
                <OnboardingModalCloseIcon />
              </button>
            </div>
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {scopeLoadError}
            </Callout>
            <OnboardingStepActions
              forwardSlot={
                <button type="button" onClick={onDismiss}>
                  Close
                </button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const formParent = resolveProjectCreateFormParent({
    preferredWorkspaceId: workspaceId,
    workspaces,
  });

  if (workspaces.length === 0 || formParent.preferredWorkspaceDenied) {
    return (
      <div
        className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[104]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-onboarding-create-title"
      >
        <div className="ds-onboarding-modal-panel flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
          <div className="ds-onboarding-modal-scroll-area">
            <div className="ds-onboarding-modal-panel-header">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 id="project-onboarding-create-title" className="ds-onboarding-modal-title">
                  Workspace required
                </h2>
              </div>
              <button
                type="button"
                className="ds-onboarding-modal-close"
                onClick={onDismiss}
                aria-label="Close"
              >
                <OnboardingModalCloseIcon />
              </button>
            </div>
            <p className="ds-onboarding-modal-lede">
              You do not have permission to create a project in any RiskAI workspace. Ask a workspace
              owner or admin for access.
            </p>
            <OnboardingStepActions
              forwardSlot={
                <button type="button" onClick={onDismiss}>
                  Close
                </button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const { showWorkspaceSelector } = projectCreateSelectorVisibility({
    workspaceBound: formParent.workspaceBound,
    preferredWorkspaceDenied: formParent.preferredWorkspaceDenied,
    workspacesCount: workspaces.length,
  });

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[104]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-onboarding-create-title"
    >
      {/*
        Scroll the inner region only: putting overflow-y on the panel clips border-radius + box-shadow
        against the frosted backdrop (noticeable on step 5+ and invite). Outer keeps the full “card” ring.
      */}
      <div className="ds-onboarding-modal-panel flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
        <div className="ds-onboarding-modal-scroll-area">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={step} of={PROJECT_ONBOARDING_STEP_TOTAL} />
            <h2 id="project-onboarding-create-title" className="ds-onboarding-modal-title">
              {step === 1 && "Name and location"}
              {step === 2 && "Currency"}
              {step === 3 && "Risk appetite"}
              {step === 4 && "Commercials"}
              {step === 5 && "Time"}
            </h2>
          </div>
          <button
            type="button"
            className="ds-onboarding-modal-close"
            onClick={onDismiss}
            disabled={creating}
            aria-label="Close"
          >
            <OnboardingModalCloseIcon />
          </button>
        </div>
        <p className="ds-onboarding-modal-lede">
          {step === 1 && "Set the project identity first."}
          {step === 2 && "Select the project currency."}
          {step === 3 && "Set the project risk appetite."}
          {step === 4 && "Capture financial parameters."}
          {step === 5 && "Capture schedule parameters before inviting users."}
        </p>
        <form onSubmit={handleFinalSubmit} className="ds-onboarding-modal-form">
          {step === 1 && (
            <>
              {showWorkspaceSelector ? (
                <div>
                  <label htmlFor="project-onboarding-workspace" className="ds-onboarding-modal-label">
                    Workspace <span className="text-[var(--ds-status-danger)]">*</span>
                  </label>
                  <select
                    id="project-onboarding-workspace"
                    value={selectedWorkspaceId}
                    onChange={(e) => {
                      setSelectedWorkspaceId(e.target.value);
                    }}
                    disabled={creating}
                    required
                    className="ds-onboarding-modal-select"
                  >
                    <option value="" disabled>
                      Select a workspace
                    </option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name || w.slug || w.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label htmlFor="project-onboarding-name" className="ds-onboarding-modal-label">
                  Project name <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. North corridor upgrade"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-code" className="ds-onboarding-modal-label">
                  Project code
                </label>
                <input
                  id="project-onboarding-code"
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. NGU-01"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-location" className="ds-onboarding-modal-label">
                  Project location <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. Sydney, NSW"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-industry" className="ds-onboarding-modal-label">
                  Project industry <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-industry"
                  value={projectIndustry}
                  onChange={(e) => setProjectIndustry(e.target.value)}
                  disabled={creating}
                  className="ds-onboarding-modal-select"
                >
                  <option value="">
                    Select industry
                  </option>
                  {PROJECT_INDUSTRY_VALUES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="project-onboarding-stage" className="ds-onboarding-modal-label">
                  Project stage <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-stage"
                  value={projectStage}
                  onChange={(e) => setProjectStage(e.target.value)}
                  disabled={creating}
                  className="ds-onboarding-modal-select"
                >
                  <option value="">
                    Select stage
                  </option>
                  {PROJECT_STAGE_VALUES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {step === 2 && (
            <div>
              <label htmlFor="project-onboarding-currency" className="ds-onboarding-modal-label">
                Project currency <span className="text-[var(--ds-status-danger)]">*</span>
              </label>
              <select
                id="project-onboarding-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as ProjectCurrency)}
                disabled={creating}
                className="ds-onboarding-modal-select"
              >
                {PROJECT_CURRENCY_VALUES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          )}
          {step === 3 && (
            <div>
              <label htmlFor="project-onboarding-risk-appetite" className="ds-onboarding-modal-label">
                Risk appetite <span className="text-[var(--ds-status-danger)]">*</span>
              </label>
              <select
                id="project-onboarding-risk-appetite"
                value={riskAppetite}
                onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite)}
                disabled={creating}
                className="ds-onboarding-modal-select"
              >
                {RISK_APPETITE_VALUES.map((appetite) => (
                  <option key={appetite} value={appetite}>
                    {appetite}
                  </option>
                ))}
              </select>
            </div>
          )}
          {step === 4 && (
            <>
              <div>
                <label htmlFor="project-onboarding-project-value" className="ds-onboarding-modal-label">
                  Project value <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-project-value"
                  type="text"
                  inputMode="decimal"
                  value={projectValueInput}
                  onChange={(e) => setProjectValueInput(formatNumericInput(e.target.value))}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. $187,000,000"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-contingency-value" className="ds-onboarding-modal-label">
                  Project contingency <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-contingency-value"
                  type="text"
                  inputMode="decimal"
                  value={contingencyValueInput}
                  onChange={(e) => setContingencyValueInput(formatNumericInput(e.target.value))}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. $10,000,000"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-delay-cost" className="ds-onboarding-modal-label">
                  Cost of Delay Per Working Day <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-delay-cost"
                  type="text"
                  inputMode="decimal"
                  value={delayCostPerWorkingDayInput}
                  onChange={(e) => setDelayCostPerWorkingDayInput(formatNumericInput(e.target.value))}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. $50,000"
                  autoComplete="off"
                  disabled={creating}
                />
              </div>
            </>
          )}
          {step === 5 && (
            <>
              <div>
                <label htmlFor="project-onboarding-planned-duration" className="ds-onboarding-modal-label">
                  Planned duration (months) <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <div className="ds-onboarding-modal-input-with-unit">
                  <input
                    id="project-onboarding-planned-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={plannedDurationMonths}
                    onChange={(e) => setPlannedDurationMonths(e.target.value)}
                    className="ds-onboarding-modal-input ds-onboarding-modal-input--has-unit"
                    placeholder="e.g. 24"
                    disabled={creating}
                  />
                  {plannedDurationMonths.trim() ? (
                    <span
                      className="ds-onboarding-modal-input-unit"
                      style={{
                        left: `calc(0.75rem + ${Math.max(plannedDurationMonths.length, 1)}ch + 0.25ch)`,
                      }}
                      aria-hidden="true"
                    >
                      months
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <label htmlFor="project-onboarding-target-date" className="ds-onboarding-modal-label">
                  Target completion date <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <div className="ds-onboarding-modal-date-picker" ref={calendarRef}>
                  <button
                    id="project-onboarding-target-date"
                    ref={calendarTriggerRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={calendarOpen}
                    aria-controls="project-onboarding-date-calendar"
                    className="ds-onboarding-modal-input ds-onboarding-modal-date-trigger"
                    onClick={() => {
                      if (creating) return;
                      const parsed = parseIsoDate(targetCompletionDate);
                      setCalendarMonth(parsed ?? new Date());
                      setCalendarOpen((prev) => !prev);
                    }}
                    disabled={creating}
                  >
                    <span>{formatDisplayDate(targetCompletionDate)}</span>
                    <span className="ds-onboarding-modal-date-trigger-icon" aria-hidden="true" />
                  </button>
                  {calendarOpen &&
                    createPortal(
                      <div
                        id="project-onboarding-date-calendar"
                        role="dialog"
                        ref={calendarPopoverRef}
                        className="ds-onboarding-modal-calendar-popover"
                        style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px` }}
                      >
                      <div className="ds-onboarding-modal-calendar-header">
                        <span className="ds-onboarding-modal-calendar-month">{visibleMonthLabel}</span>
                        <div className="ds-onboarding-modal-calendar-nav">
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                              )
                            }
                            aria-label="Previous month"
                          >
                            &#8592;
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCalendarMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                              )
                            }
                            aria-label="Next month"
                          >
                            &#8594;
                          </button>
                        </div>
                      </div>
                      <div className="ds-onboarding-modal-calendar-grid">
                        {WEEKDAY_LABELS.map((label, index) => (
                          <div key={`${label}-${index}`} className="ds-onboarding-modal-calendar-weekday">
                            {label}
                          </div>
                        ))}
                        {calendarDays.map((day) => (
                          <button
                            key={day.iso}
                            type="button"
                            className={[
                              "ds-onboarding-modal-calendar-day",
                              day.inMonth ? "" : "is-muted",
                              day.isToday ? "is-today" : "",
                              day.isSelected ? "is-selected" : "",
                            ]
                              .join(" ")
                              .trim()}
                            onClick={() => {
                              setTargetCompletionDate(day.iso);
                              setCalendarOpen(false);
                            }}
                          >
                            {day.date.getDate()}
                          </button>
                        ))}
                      </div>
                      <div className="ds-onboarding-modal-calendar-footer">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompletionDate("");
                            setCalendarOpen(false);
                          }}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCompletionDate(formatIsoDate(today));
                            setCalendarMonth(today);
                            setCalendarOpen(false);
                          }}
                        >
                          Today
                        </button>
                      </div>
                      </div>,
                      document.body
                    )}
                </div>
              </div>
              <div>
                <label htmlFor="project-onboarding-working-calendar" className="ds-onboarding-modal-label">
                  Working Days Per Week <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-working-calendar"
                  value={workingDaysPerWeek}
                  onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value) as WorkingDaysPerWeek)}
                  disabled={creating}
                  className="ds-onboarding-modal-select"
                >
                  {WORKING_DAYS_PER_WEEK_VALUES.map((days) => (
                    <option key={days} value={days}>
                      {days}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="project-onboarding-schedule-contingency" className="ds-onboarding-modal-label">
                  Schedule contingency (working days) <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <div className="ds-onboarding-modal-input-with-unit">
                  <input
                    id="project-onboarding-schedule-contingency"
                    type="number"
                    min={0}
                    step={1}
                    value={scheduleContingencyWorkingDays}
                    onChange={(e) => setScheduleContingencyWorkingDays(e.target.value)}
                    className="ds-onboarding-modal-input ds-onboarding-modal-input--has-unit"
                    placeholder="e.g. 20"
                    disabled={creating}
                  />
                  {scheduleContingencyWorkingDays.trim() ? (
                    <span
                      className="ds-onboarding-modal-input-unit"
                      style={{
                        left: `calc(0.75rem + ${Math.max(scheduleContingencyWorkingDays.length, 1)}ch + 0.25ch)`,
                      }}
                      aria-hidden="true"
                    >
                      days
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          )}
          {error && showErrorCallout && (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            onBack={step === 1 ? undefined : () => setStep((prev) => Math.max(1, prev - 1) as CreateStep)}
            busy={creating}
            forwardSlot={
              step === 5 ? (
                <button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Continue"}
                </button>
              ) : (
                <button type="button" disabled={creating} onClick={handleStepContinue}>
                  Continue
                </button>
              )
            }
          />
        </form>
        </div>
      </div>
    </div>
  );
}
