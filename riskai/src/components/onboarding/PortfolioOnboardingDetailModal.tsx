"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_REPORTING_CURRENCY,
  DEFAULT_REPORTING_UNIT,
  REPORTING_CURRENCY_OPTIONS,
  REPORTING_UNIT_LABELS,
  REPORTING_UNIT_OPTIONS,
} from "@/lib/portfolio/reportingPreferences";
import { projectSettingsFieldWidthClass } from "@/components/project/projectSettingsDsFormClasses";
import { Callout } from "@visualify/design-system";
import {
  OnboardingStepLabel,
  PORTFOLIO_ONBOARDING_STEP_TOTAL,
} from "./OnboardingStepLabel";
import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  portfolioId: string;
  onContinue: () => void | Promise<void>;
  onBack: () => void;
  /** Close (×) — dismisses the whole portfolio wizard, same as step 1. */
  onDismiss: () => void;
};

export function PortfolioOnboardingDetailModal({
  open,
  portfolioId,
  onContinue,
  onBack,
  onDismiss,
}: Props) {
  const [reportingCurrency, setReportingCurrency] = useState(DEFAULT_REPORTING_CURRENCY);
  const [reportingUnit, setReportingUnit] = useState(DEFAULT_REPORTING_UNIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReportingCurrency(DEFAULT_REPORTING_CURRENCY);
    setReportingUnit(DEFAULT_REPORTING_UNIT);
    setError(null);
  }, [open, portfolioId]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporting_currency: reportingCurrency,
          reporting_unit: reportingUnit,
        }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save.");
        return;
      }
      await onContinue();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[102]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-portfolio-detail-title"
    >
      <div className="ds-onboarding-modal-panel">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1 space-y-1">
            <OnboardingStepLabel step={2} of={PORTFOLIO_ONBOARDING_STEP_TOTAL} />
            <h2 id="onboarding-portfolio-detail-title" className="ds-onboarding-modal-title">
              Reporting preferences
            </h2>
          </div>
          <button
            type="button"
            className="ds-onboarding-modal-close"
            onClick={onDismiss}
            disabled={saving}
            aria-label="Close"
          >
            <OnboardingModalCloseIcon />
          </button>
        </div>
        <p className="ds-onboarding-modal-lede">
          Choose how financial amounts are labeled for this portfolio. You can change this anytime in
          portfolio settings.
        </p>

        <form onSubmit={handleSubmit} className="ds-onboarding-modal-form">
          <div className={projectSettingsFieldWidthClass("sm")}>
            <label htmlFor="onb-portfolio-reporting-currency" className="ds-onboarding-modal-label">
              Reporting currency
            </label>
            <select
              id="onb-portfolio-reporting-currency"
              value={reportingCurrency}
              onChange={(e) => setReportingCurrency(e.target.value)}
              disabled={saving}
              className="ds-onboarding-modal-select"
            >
              {REPORTING_CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className={projectSettingsFieldWidthClass("sm")}>
            <label htmlFor="onb-portfolio-reporting-unit" className="ds-onboarding-modal-label">
              Reporting unit
            </label>
            <select
              id="onb-portfolio-reporting-unit"
              value={reportingUnit}
              onChange={(e) => setReportingUnit(e.target.value)}
              disabled={saving}
              className="ds-onboarding-modal-select"
            >
              {REPORTING_UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>
                  {REPORTING_UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <Callout status="danger" role="alert" className="ds-onboarding-modal-callout">
              {error}
            </Callout>
          )}
          <OnboardingStepActions
            onBack={onBack}
            busy={saving}
            forwardSlot={
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Continue"}
              </button>
            }
          />
        </form>
      </div>
    </div>
  );
}
