"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@visualify/design-system";

/** `h2` id — referenced by category/owner breakdown regions when rendered inside this modal. */
export const PORTFOLIO_DASHBOARD_CARD_MODAL_TITLE_ID = "portfolio-dashboard-card-dialog-title";

type PortfolioDashboardCardModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** When set with total greater than 1, shows the same position + Previous / Next strip as {@link DocumentKpiModal}. */
  cyclePosition?: { index: number; total: number } | null;
  onCyclePrev?: () => void;
  onCycleNext?: () => void;
};

/**
 * Full-screen scrim + wide panel for portfolio dashboard card drill-downs (same shell as {@link DocumentKpiModal}).
 */
export function PortfolioDashboardCardModal({
  open,
  title,
  onClose,
  children,
  cyclePosition,
  onCyclePrev,
  onCycleNext,
}: PortfolioDashboardCardModalProps) {
  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const showCycleFooter =
    cyclePosition != null && cyclePosition.total > 1 && onCyclePrev != null && onCycleNext != null;
  const safeCycleIndex = showCycleFooter
    ? Math.min(Math.max(0, cyclePosition.index), Math.max(0, cyclePosition.total - 1))
    : 0;
  const canCyclePrev = showCycleFooter && safeCycleIndex > 0;
  const cycleTotal = cyclePosition?.total ?? 0;
  const canCycleNext = showCycleFooter && safeCycleIndex < cycleTotal - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (showCycleFooter) {
        if (e.key === "ArrowLeft" && canCyclePrev) {
          e.preventDefault();
          onCyclePrev?.();
          return;
        }
        if (e.key === "ArrowRight" && canCycleNext) {
          e.preventDefault();
          onCycleNext?.();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose, showCycleFooter, canCyclePrev, canCycleNext, onCyclePrev, onCycleNext]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) requestClose();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ds-modal-backdrop z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={PORTFOLIO_DASHBOARD_CARD_MODAL_TITLE_ID}
      onClick={handleBackdropClick}
    >
      <div
        tabIndex={-1}
        className="w-full max-w-[70vw] max-h-[90vh] min-h-[400px] shrink-0 flex flex-col overflow-hidden outline-none rounded-[var(--ds-radius-lg)] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 shrink-0 border-b border-[var(--ds-border)] px-4 sm:px-6 py-3">
          <h2
            id={PORTFOLIO_DASHBOARD_CARD_MODAL_TITLE_ID}
            className="text-[length:var(--ds-text-lg)] font-semibold text-[var(--ds-text-primary)] m-0 min-w-0 flex-1 truncate"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="p-2 rounded-[var(--ds-radius-sm)] hover:bg-[var(--ds-surface-hover)] text-[var(--ds-text-secondary)] transition-colors shrink-0"
            aria-label="Close"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col justify-start">
          <div className="w-full min-w-0">{children}</div>
        </div>

        {showCycleFooter && cyclePosition != null ? (
          <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 px-4 sm:px-6 py-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] w-full">
            <p className="text-[length:var(--ds-text-xs)] text-[var(--ds-text-muted)] m-0 tabular-nums">
              {safeCycleIndex + 1} / {cyclePosition.total}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onCyclePrev}
                disabled={!canCyclePrev}
                aria-label="Previous breakdown"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onCycleNext}
                disabled={!canCycleNext}
                aria-label="Next breakdown"
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
