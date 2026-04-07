"use client";

import { useEffect, useState } from "react";
import { projectSettingsSelectClass } from "@/components/project/projectSettingsDsFormClasses";
import { REPORTING_UNIT_LABELS, REPORTING_UNIT_OPTIONS } from "@/lib/portfolio/reportingPreferences";
import type { FinancialUnit, ProjectCurrency, RiskAppetite } from "@/lib/projectContext";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PROJECT_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  portfolioId: string | null;
  initialStep?: CreateStep;
  onCreated: (project: { id: string; name: string }) => void | Promise<void>;
  onDismiss: () => void;
};

type CreateStep = 1 | 2 | 3 | 4 | 5;

export function ProjectOnboardingCreateModal({
  open,
  portfolioId,
  initialStep = 1,
  onCreated,
  onDismiss,
}: Props) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState<ProjectCurrency>("AUD");
  const [financialUnit, setFinancialUnit] = useState<FinancialUnit>("MILLIONS");
  const [projectValueInput, setProjectValueInput] = useState("");
  const [contingencyValueInput, setContingencyValueInput] = useState("");
  const [plannedDurationMonths, setPlannedDurationMonths] = useState("");
  const [targetCompletionDate, setTargetCompletionDate] = useState("");
  const [scheduleContingencyWeeks, setScheduleContingencyWeeks] = useState("");
  const [riskAppetite, setRiskAppetite] = useState<RiskAppetite>("P80");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setName("");
    setLocation("");
    setCurrency("AUD");
    setFinancialUnit("MILLIONS");
    setProjectValueInput("");
    setContingencyValueInput("");
    setPlannedDurationMonths("");
    setTargetCompletionDate("");
    setScheduleContingencyWeeks("");
    setRiskAppetite("P80");
    setError(null);
  }, [open, portfolioId, initialStep]);

  if (!open) return null;

  function validateStep(current: CreateStep): boolean {
    const trimmed = name.trim();
    if (current === 1 && !trimmed) {
      setError("Project name is required.");
      return false;
    }
    if (current === 2) {
      if (!currency) {
        setError("Currency is required.");
        return false;
      }
      if (!financialUnit) {
        setError("Unit is required.");
        return false;
      }
    }
    if (current === 3 && !riskAppetite) {
      setError("Risk appetite is required.");
      return false;
    }
    if (current === 4) {
      const projectValue = Number(projectValueInput);
      if (!Number.isFinite(projectValue) || projectValue <= 0) {
        setError("Project value is required.");
        return false;
      }
      const contingencyValue = Number(contingencyValueInput);
      if (!Number.isFinite(contingencyValue) || contingencyValue < 0) {
        setError("Contingency value is required.");
        return false;
      }
    }
    if (current === 5) {
      const plannedDuration = Number(plannedDurationMonths);
      if (!Number.isInteger(plannedDuration) || plannedDuration <= 0) {
        setError("Planned duration is required.");
        return false;
      }
      if (!targetCompletionDate.trim()) {
        setError("Target completion date is required.");
        return false;
      }
      const scheduleContingency = Number(scheduleContingencyWeeks);
      if (!Number.isInteger(scheduleContingency) || scheduleContingency < 0) {
        setError("Schedule contingency is required.");
        return false;
      }
    }
    return true;
  }

  function handleStepContinue() {
    setError(null);
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(5, prev + 1) as CreateStep);
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateStep(5)) return;
    const trimmed = name.trim();
    const trimmedLocation = location.trim();
    const projectValue = Number(projectValueInput);
    const contingencyValue = Number(contingencyValueInput);
    const plannedDuration = Number(plannedDurationMonths);
    const scheduleContingency = Number(scheduleContingencyWeeks);

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ name: trimmed, ...(portfolioId ? { portfolioId } : {}) }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        project?: { id: string; name: string };
        error?: string;
      };
      if (!res.ok || !json.project?.id) {
        setError(json.error?.trim() || "Could not create project.");
        return;
      }
      const settingsRes = await fetch(`/api/projects/${json.project.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_name: trimmed,
          location: trimmedLocation || null,
          currency,
          financial_unit: financialUnit,
          project_value_input: projectValue,
          contingency_value_input: contingencyValue,
          planned_duration_months: plannedDuration,
          target_completion_date: targetCompletionDate,
          schedule_contingency_weeks: scheduleContingency,
          risk_appetite: riskAppetite,
        }),
      });
      const settingsJson = (await settingsRes.json().catch(() => ({}))) as { error?: string };
      if (!settingsRes.ok) {
        setError(settingsJson.error?.trim() || "Project was created but settings could not be saved.");
        return;
      }
      await onCreated({ id: json.project.id, name: json.project.name });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[104]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-onboarding-create-title"
    >
      <div className="ds-onboarding-modal-panel max-h-[85vh] overflow-y-auto">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={step} of={PROJECT_ONBOARDING_STEP_TOTAL} />
            <h2 id="project-onboarding-create-title" className="ds-onboarding-modal-title">
              {step === 1 && "Name and location"}
              {step === 2 && "Units"}
              {step === 3 && "Risk appetite"}
              {step === 4 && "$"}
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
          {step === 2 && "Select reporting and financial units."}
          {step === 3 && "Set the project risk appetite."}
          {step === 4 && "Capture financial parameters."}
          {step === 5 && "Capture schedule parameters before inviting users."}
        </p>
        <form onSubmit={handleFinalSubmit} className="ds-onboarding-modal-form">
          {step === 1 && (
            <>
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
                <label htmlFor="project-onboarding-location" className="ds-onboarding-modal-label">
                  Location
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
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label htmlFor="project-onboarding-currency" className="ds-onboarding-modal-label">
                  Currency <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as ProjectCurrency)}
                  disabled={creating}
                  className={projectSettingsSelectClass(false, "sm")}
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label htmlFor="project-onboarding-unit" className="ds-onboarding-modal-label">
                  Unit <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-unit"
                  value={financialUnit}
                  onChange={(e) => setFinancialUnit(e.target.value as FinancialUnit)}
                  disabled={creating}
                  className={projectSettingsSelectClass(false, "sm")}
                >
                  {REPORTING_UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {REPORTING_UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>
            </>
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
                className={projectSettingsSelectClass(false, "sm")}
              >
                <option value="P10">P10</option>
                <option value="P20">P20</option>
                <option value="P30">P30</option>
                <option value="P40">P40</option>
                <option value="P50">P50</option>
                <option value="P60">P60</option>
                <option value="P70">P70</option>
                <option value="P80">P80</option>
                <option value="P90">P90</option>
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
                  type="number"
                  min={0}
                  step="any"
                  value={projectValueInput}
                  onChange={(e) => setProjectValueInput(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. 217"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-contingency-value" className="ds-onboarding-modal-label">
                  Contingency value <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-contingency-value"
                  type="number"
                  min={0}
                  step="any"
                  value={contingencyValueInput}
                  onChange={(e) => setContingencyValueInput(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. 22"
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
                <input
                  id="project-onboarding-planned-duration"
                  type="number"
                  min={1}
                  step={1}
                  value={plannedDurationMonths}
                  onChange={(e) => setPlannedDurationMonths(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. 24"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-target-date" className="ds-onboarding-modal-label">
                  Target completion date <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-target-date"
                  type="date"
                  value={targetCompletionDate}
                  onChange={(e) => setTargetCompletionDate(e.target.value)}
                  className="ds-onboarding-modal-input"
                  disabled={creating}
                />
              </div>
              <div>
                <label htmlFor="project-onboarding-schedule-contingency" className="ds-onboarding-modal-label">
                  Schedule contingency (weeks) <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-schedule-contingency"
                  type="number"
                  min={0}
                  step={1}
                  value={scheduleContingencyWeeks}
                  onChange={(e) => setScheduleContingencyWeeks(e.target.value)}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. 4"
                  disabled={creating}
                />
              </div>
            </>
          )}
          {error && (
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
  );
}
