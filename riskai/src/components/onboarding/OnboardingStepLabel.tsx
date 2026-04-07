"use client";

const stepLabelClass =
  "mb-1 text-xs font-medium uppercase tracking-wide text-[var(--ds-text-muted)]";

type Props = {
  step: number;
  of: number;
};

/** Shared “Step n of m” line for onboarding modals (uppercase via Tailwind). */
export function OnboardingStepLabel({ step, of }: Props) {
  return (
    <p className={stepLabelClass} aria-label={`Step ${step} of ${of}`}>
      Step {step} of {of}
    </p>
  );
}

/** Portfolio creation flow: name → reporting → invite or skip. */
export const PORTFOLIO_ONBOARDING_STEP_TOTAL = 3;
/** Project onboarding flow: 1 name/location, 2 units, 3 appetite, 4 money, 5 time, 6 users. */
export const PROJECT_ONBOARDING_STEP_TOTAL = 6;
