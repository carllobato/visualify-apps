"use client";

import { OnboardingModalCloseIcon } from "./OnboardingModalCloseIcon";
import { OnboardingStepActions } from "./OnboardingStepActions";

type Props = {
  open: boolean;
  onStartProjectOnboarding: () => void;
  onDismiss: () => void;
};

export function FirstProjectPromptModal({ open, onStartProjectOnboarding, onDismiss }: Props) {
  if (!open) return null;

  return (
    <div
      className="ds-onboarding-modal-backdrop ds-onboarding-modal-backdrop--raised !z-[103]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-project-prompt-title"
    >
      <div className="ds-onboarding-modal-panel">
        <div className="ds-onboarding-modal-panel-header">
          <div className="min-w-0 flex-1">
            <h2 id="first-project-prompt-title" className="ds-onboarding-modal-title">
              Start your first project
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
          Your portfolio is ready. Add your first project to start building risk registers and simulations.
        </p>
        <div className="ds-onboarding-modal-form">
          <OnboardingStepActions
            forwardSlot={
              <button type="button" onClick={onStartProjectOnboarding}>
                Start first project
              </button>
            }
          />
          <div className="text-center">
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-medium text-[var(--ds-text-secondary)] underline-offset-2 hover:text-[var(--ds-text-primary)] hover:underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
