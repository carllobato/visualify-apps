"use client";

import type { ReactNode } from "react";

type Props = {
  /** Omit on the first step (e.g. profile). */
  onBack?: () => void;
  backLabel?: string;
  /** Primary action (usually a submit button). */
  forwardSlot: ReactNode;
  busy?: boolean;
};

/**
 * Shared footer for onboarding modals: optional Back + primary forward control.
 */
export function OnboardingStepActions({
  onBack,
  backLabel = "Back",
  forwardSlot,
  busy,
}: Props) {
  if (!onBack) {
    return <div className="mt-6 space-y-3">{forwardSlot}</div>;
  }

  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="rounded-[var(--ds-radius-sm)] border border-[var(--ds-border)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--ds-text-primary)] transition-opacity hover:bg-[var(--ds-surface-hover)] disabled:opacity-50 sm:min-w-[100px]"
      >
        {backLabel}
      </button>
      <div className="min-w-0 flex-1 sm:max-w-sm sm:flex-none">{forwardSlot}</div>
    </div>
  );
}
