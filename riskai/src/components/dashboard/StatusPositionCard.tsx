import type { ReactNode } from "react";

/** Match `SummaryTile` / simulation metric tiles (document tile + hover). */
const documentTileSurfaceClass = "ds-document-tile-panel ds-document-tile-panel--interactive";

export type StatusPositionTone = "on_track" | "at_risk" | "off_track" | "neutral";

export interface StatusPositionCardProps {
  tone: StatusPositionTone;
  primaryText: string;
  /** Merged onto the primary headline row (e.g. larger type for a hero summary). */
  primaryClassName?: string;

  label?: string;
  secondaryText?: string;
  /** When set, rendered below the headline instead of `secondaryText` (e.g. compact metric row). */
  supportingSlot?: ReactNode;
  helperText?: string;

  leadingVisual?: ReactNode;
  footer?: ReactNode;

  className?: string;
  /** Merged onto `CardContent` (e.g. tighter padding for a headline tile). */
  contentClassName?: string;
}

const tonePrimaryText: Record<StatusPositionTone, string> = {
  on_track: "text-[var(--ds-status-success-fg)]",
  at_risk: "text-[var(--ds-status-warning-fg)]",
  off_track: "text-[var(--ds-status-danger-fg)]",
  neutral: "text-[var(--ds-text-primary)]",
};

export function StatusPositionCard({
  tone,
  primaryText,
  primaryClassName = "",
  label,
  secondaryText,
  supportingSlot,
  helperText,
  leadingVisual,
  footer,
  className = "",
  contentClassName = "",
}: StatusPositionCardProps) {
  const bodyClass = contentClassName.trim() || "p-4";
  return (
    <div className={`${documentTileSurfaceClass} text-[var(--ds-text-secondary)] ${className}`.trim()}>
      <div className={bodyClass}>
        <div className="flex flex-col">
          {label ? (
            <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
              {label}
            </div>
          ) : null}

          {leadingVisual != null ? <div className={label ? "mt-2" : ""}>{leadingVisual}</div> : null}

          <div
            className={`font-bold leading-tight tracking-tight ${tonePrimaryText[tone]} ${
              label || leadingVisual != null ? "mt-1.5" : ""
            } ${primaryClassName.trim() ? primaryClassName : "text-[length:var(--ds-text-lg)]"}`.trim()}
          >
            {primaryText}
          </div>

          {supportingSlot != null ? (
            <div className="mt-2 min-w-0">{supportingSlot}</div>
          ) : secondaryText ? (
            <p className="m-0 mt-2 text-[length:var(--ds-text-sm)] leading-snug text-[var(--ds-text-secondary)]">
              {secondaryText}
            </p>
          ) : null}

          {helperText ? (
            <p className="m-0 mt-1 text-[11px] leading-snug text-[var(--ds-text-muted)]">{helperText}</p>
          ) : null}

          {footer != null ? (
            <div className="mt-3 border-t border-[var(--ds-border-subtle)] pt-3 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
