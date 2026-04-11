"use client";

import { createPortal } from "react-dom";
import { Button } from "@visualify/design-system";
import { RiskChatPanel } from "@/components/risk-register/RiskChatPanel";

export function CreateRiskAIModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  /** Passed through to extract-risk for usage logging when creating from chat. */
  projectId?: string | null;
}) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="ds-modal-backdrop z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-risk-ai-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[min(70vw,720px)] max-h-[90vh] min-h-[380px] shrink-0 flex flex-col overflow-hidden rounded-[var(--ds-radius-lg)] border-0 bg-[var(--ds-surface-elevated)] shadow-[var(--ds-elevation-tile)] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 bg-[var(--ds-surface-muted)] px-4 py-3 sm:px-6">
          <h2
            id="create-risk-ai-dialog-title"
            className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)]"
          >
            Generate risk with AI
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            className="h-9 w-9 shrink-0 p-0"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-[var(--ds-text-primary)]"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col px-0">
          <RiskChatPanel projectId={projectId} onRiskCreated={() => onClose()} />
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
