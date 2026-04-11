"use client";

/** Same document tile surface as `SummaryTile` / dashboard KPI cards (`ds-document-tile-panel`). */
const choiceTileClass =
  "ds-document-tile-panel ds-document-tile-panel--interactive w-full min-w-0 p-4 flex flex-col min-h-[140px] text-left cursor-pointer font-inherit outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ds-border)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-document-tile-bg)]";
const choiceTitleClass = "text-base font-medium text-[var(--ds-text-primary)] m-0 mb-2";
const choiceDescClass = "text-sm text-[var(--ds-text-secondary)] flex-1 m-0";

export function AddNewRiskChoiceModal({
  open,
  onClose,
  onAddManualRisk,
  onGenerateWithText,
  onGenerateWithFile,
}: {
  open: boolean;
  onClose: () => void;
  /** Opens manual add form (empty risk) */
  onAddManualRisk?: () => void;
  /** Opens AI chat to generate a risk */
  onGenerateWithText?: () => void;
  /** Opens file upload flow */
  onGenerateWithFile?: () => void;
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
      <div className="ds-modal-panel" onClick={(e) => e.stopPropagation()}>
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
          <div
            className={
              onAddManualRisk
                ? "ds-modal-panel-body-grid ds-modal-panel-body-grid--three"
                : "ds-modal-panel-body-grid"
            }
          >
            {onAddManualRisk && (
              <button
                type="button"
                className={choiceTileClass}
                onClick={() => {
                  onClose();
                  onAddManualRisk();
                }}
              >
                <span className={choiceTitleClass}>Add risk manually</span>
                <span className={choiceDescClass}>
                  Fill in the risk form (title, category, ratings, mitigation, etc.)
                </span>
              </button>
            )}
            {onGenerateWithText && (
              <button
                type="button"
                className={choiceTileClass}
                onClick={() => {
                  onClose();
                  onGenerateWithText();
                }}
              >
                <span className={choiceTitleClass}>Generate risk with text</span>
                <span className={choiceDescClass}>
                  Chat with AI to describe the risk, then create a structured record.
                </span>
              </button>
            )}
            {onGenerateWithFile && (
              <button
                type="button"
                className={choiceTileClass}
                onClick={() => {
                  onClose();
                  onGenerateWithFile();
                }}
              >
                <span className={choiceTitleClass}>Generate risk with a file</span>
                <span className={choiceDescClass}>
                  Upload an Excel file to extract one or more risks.
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
