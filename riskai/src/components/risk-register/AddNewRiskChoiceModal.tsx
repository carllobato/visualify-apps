"use client";

import { Button } from "@visualify/design-system";

/** Card shell — click target is the `Button` below, not the whole tile. */
const choiceTileClass =
  "ds-document-tile-panel flex h-full min-h-0 w-full min-w-0 flex-col gap-3 p-4 text-left";
const choiceTitleClass = "text-base font-medium text-[var(--ds-text-primary)] m-0";
const choiceDescClass = "text-sm text-[var(--ds-text-secondary)] m-0";

export function AddNewRiskChoiceModal({
  open,
  onClose,
  onAddManualRisk,
  onGenerateWithText,
}: {
  open: boolean;
  onClose: () => void;
  /** Opens manual add form (empty risk) */
  onAddManualRisk?: () => void;
  /** Opens AI chat to generate a risk */
  onGenerateWithText?: () => void;
}) {
  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="ds-modal-backdrop z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-new-risk-choice-title"
      onClick={handleBackdropClick}
    >
      <div
        className="ds-modal-panel ds-modal-panel--fit-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal-panel-header">
          <h2 id="add-new-risk-choice-title" className="ds-modal-panel-title">
            Add new risk
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ds-onboarding-modal-close"
            aria-label="Close"
          >
            <span aria-hidden className="ds-modal-panel-close-icon">
              ×
            </span>
          </button>
        </div>
        <div className="ds-modal-panel-body">
          <div className="ds-modal-panel-body-grid items-stretch">
            {onAddManualRisk && (
              <div className={choiceTileClass}>
                <div className="flex min-h-0 flex-col gap-1">
                  <h3 className={choiceTitleClass}>Add risk manually</h3>
                  <p className={choiceDescClass}>
                    Fill in the risk form (title, category, ratings, mitigation, etc.)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="mt-auto w-full shrink-0 justify-center"
                  onClick={() => {
                    onClose();
                    onAddManualRisk();
                  }}
                >
                  Add manually
                </Button>
              </div>
            )}
            {onGenerateWithText && (
              <div className={choiceTileClass}>
                <div className="flex min-h-0 flex-col gap-1">
                  <h3 className={choiceTitleClass}>Generate risk with text</h3>
                  <p className={choiceDescClass}>
                    Chat with AI to describe the risk, then create a structured record.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="mt-auto w-full shrink-0 justify-center"
                  onClick={() => {
                    onClose();
                    onGenerateWithText();
                  }}
                >
                  Generate with AI
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
