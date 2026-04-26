"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { REPORTING_UNIT_LABELS, REPORTING_UNIT_OPTIONS } from "@/lib/portfolio/reportingPreferences";
import type { FinancialUnit, ProjectCurrency, RiskAppetite } from "@/lib/projectContext";
import type { WorkingDaysPerWeek } from "@/lib/workingDays";
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
  portfolioId,
  initialStep = 1,
  onCreated,
  onDismiss,
}: Props) {
  function sanitizeNumericInput(value: string): string {
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

  function parseFormattedNumber(value: string): number {
    const sanitized = sanitizeNumericInput(value);
    if (!sanitized) return Number.NaN;
    return Number(sanitized);
  }

  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState<ProjectCurrency>("AUD");
  const [financialUnit, setFinancialUnit] = useState<FinancialUnit>("MILLIONS");
  const [projectValueInput, setProjectValueInput] = useState("");
  const [contingencyValueInput, setContingencyValueInput] = useState("");
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
  const skipNextErrorAutoClearRef = useRef(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const calendarPopoverRef = useRef<HTMLDivElement | null>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement | null>(null);

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
    setCalendarOpen(false);
    setCalendarMonth(new Date());
    setWorkingDaysPerWeek(5);
    setScheduleContingencyWorkingDays("");
    setRiskAppetite("P80");
    setError(null);
    setShowErrorCallout(false);
  }, [open, portfolioId, initialStep]);

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
    location,
    currency,
    financialUnit,
    projectValueInput,
    contingencyValueInput,
    plannedDurationMonths,
    targetCompletionDate,
    workingDaysPerWeek,
    scheduleContingencyWorkingDays,
    riskAppetite,
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
      const projectValue = parseFormattedNumber(projectValueInput);
      if (!Number.isFinite(projectValue) || projectValue <= 0) {
        setError("Project value is required.");
        return false;
      }
      const contingencyValue = parseFormattedNumber(contingencyValueInput);
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
      const scheduleContingencyRaw = scheduleContingencyWorkingDays.trim();
      const scheduleContingency = scheduleContingencyRaw ? Number(scheduleContingencyRaw) : Number.NaN;
      if (!Number.isInteger(scheduleContingency) || scheduleContingency < 0) {
        setError("Schedule contingency is required.");
        return false;
      }
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
    const trimmed = name.trim();
    const trimmedLocation = location.trim();
    const projectValue = parseFormattedNumber(projectValueInput);
    const contingencyValue = parseFormattedNumber(contingencyValueInput);
    const plannedDuration = Number(plannedDurationMonths);
    const scheduleContingency = Number(scheduleContingencyWorkingDays);
    const scheduleContingencyWeeks = scheduleContingency / workingDaysPerWeek;

    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ name: trimmed, ...(portfolioId ? { portfolioId } : {}) }),
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
          working_days_per_week: workingDaysPerWeek,
          schedule_contingency_working_days: scheduleContingency,
          schedule_inputs_version: 2,
          schedule_contingency_weeks: scheduleContingencyWeeks,
          risk_appetite: riskAppetite,
        }),
      });
      const settingsJson = (await settingsRes.json().catch(() => ({}))) as { error?: string };
      if (!settingsRes.ok) {
        if (settingsRes.status === 401) {
          skipNextErrorAutoClearRef.current = false;
          setError(
            "Project was created, but your session expired before settings were saved. Please refresh and sign in again."
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
          settingsJson.error?.trim() ||
            "Project was created but settings could not be saved."
        );
        return;
      }
      await onCreated({ id: json.project.id, name: json.project.name });
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
              {step === 2 && "Units"}
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
                  className="ds-onboarding-modal-select"
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
                  className="ds-onboarding-modal-select"
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
                className="ds-onboarding-modal-select"
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
                  Contingency value <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <input
                  id="project-onboarding-contingency-value"
                  type="text"
                  inputMode="decimal"
                  value={contingencyValueInput}
                  onChange={(e) => setContingencyValueInput(formatNumericInput(e.target.value))}
                  className="ds-onboarding-modal-input"
                  placeholder="e.g. $9,500,000"
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
                  End to End Duration (months) <span className="text-[var(--ds-status-danger)]">*</span>
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
                  Working calendar <span className="text-[var(--ds-status-danger)]">*</span>
                </label>
                <select
                  id="project-onboarding-working-calendar"
                  value={workingDaysPerWeek}
                  onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value) as WorkingDaysPerWeek)}
                  disabled={creating}
                  className="ds-onboarding-modal-select"
                >
                  <option value={5}>5 days</option>
                  <option value={5.5}>5.5 days</option>
                  <option value={6}>6 days</option>
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
