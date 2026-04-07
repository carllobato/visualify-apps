"use client";

import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

type Props = {
  /** Omit on the first step (e.g. profile). */
  onBack?: () => void;
  backLabel?: string;
  /** Primary action (usually a submit button). */
  forwardSlot: ReactNode;
  busy?: boolean;
  /**
   * Classes merged onto `forwardSlot` when it is a single React element. Rules are defined in
   * `@visualify/design-system` `globals.css` (`.ds-onboarding-modal-primary`, etc.).
   * Omit for default primary + `--auto-sm`. Pass `""` to attach no default classes.
   */
  forwardPrimaryClassName?: string;
};

/** Default forward CTA — see `.ds-onboarding-modal-primary` in design-system `globals.css`. */
export const ONBOARDING_STEP_FORWARD_PRIMARY_CLASSES =
  "ds-onboarding-modal-primary ds-onboarding-modal-primary--auto-sm";

function mergeForwardPrimaryClass(slot: ReactNode, classNameToMerge: string | undefined): ReactNode {
  if (!classNameToMerge?.trim() || !isValidElement(slot)) return slot;
  const el = slot as ReactElement<{ className?: string }>;
  const merged = [classNameToMerge, el.props.className].filter(Boolean).join(" ");
  return cloneElement(el, { className: merged });
}

/**
 * Shared footer for onboarding modals: optional Back + primary forward control.
 */
export function OnboardingStepActions({
  onBack,
  backLabel = "Back",
  forwardSlot,
  busy,
  forwardPrimaryClassName,
}: Props) {
  const primaryClasses =
    forwardPrimaryClassName === undefined
      ? ONBOARDING_STEP_FORWARD_PRIMARY_CLASSES
      : forwardPrimaryClassName || undefined;
  const forward = mergeForwardPrimaryClass(forwardSlot, primaryClasses);

  if (!onBack) {
    return <div className="ds-onboarding-step-actions--solo">{forward}</div>;
  }

  return (
    <div className="ds-onboarding-step-actions">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="ds-onboarding-step-actions__back"
      >
        {backLabel}
      </button>
      <div className="ds-onboarding-step-actions__forward">{forward}</div>
    </div>
  );
}
