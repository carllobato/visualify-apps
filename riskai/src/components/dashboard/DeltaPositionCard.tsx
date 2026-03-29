import type { ReactNode } from "react";
import { Card, CardContent } from "@visualify/design-system";

export type DeltaPositionTone = "favorable" | "unfavorable" | "neutral" | "unknown";

export interface DeltaPositionCardProps {
  tone: DeltaPositionTone;
  primaryText: string;
  /** Merged onto the primary value row (e.g. smaller type for supporting tiles). */
  primaryClassName?: string;

  label?: string;
  secondaryText?: string;
  helperText?: string;

  leadingVisual?: ReactNode;
  footer?: ReactNode;

  className?: string;
}

const toneCardBorder: Record<DeltaPositionTone, string> = {
  favorable: "border-[var(--ds-status-success-subtle-border)]",
  unfavorable: "border-[var(--ds-status-danger-subtle-border)]",
  neutral: "",
  unknown: "border-[var(--ds-status-neutral-subtle-border)]",
};

const toneTopBand: Record<DeltaPositionTone, string> = {
  favorable: "bg-[var(--ds-status-success)]",
  unfavorable: "bg-[var(--ds-status-danger)]",
  neutral: "bg-[var(--ds-border)]",
  unknown: "bg-[var(--ds-status-neutral)]",
};

const tonePrimaryText: Record<DeltaPositionTone, string> = {
  favorable: "text-[var(--ds-text-primary)]",
  unfavorable: "text-[var(--ds-text-primary)]",
  neutral: "text-[var(--ds-text-primary)]",
  unknown: "text-[var(--ds-text-muted)]",
};

export function DeltaPositionCard({
  tone,
  primaryText,
  primaryClassName = "",
  label,
  secondaryText,
  helperText,
  leadingVisual,
  footer,
  className = "",
}: DeltaPositionCardProps) {
  return (
    <Card className={`${toneCardBorder[tone]} ${className}`.trim()}>
      <CardContent>
        <div className="flex flex-col">
          <div
            className={`mb-2 h-0.5 w-full shrink-0 rounded-full ${toneTopBand[tone]}`.trim()}
            aria-hidden
          />

          {label ? (
            <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
              {label}
            </div>
          ) : null}

          {leadingVisual != null ? <div className={label ? "mt-2" : ""}>{leadingVisual}</div> : null}

          <div
            className={`font-semibold leading-snug ${tonePrimaryText[tone]} ${
              label || leadingVisual != null ? "mt-1" : ""
            } ${primaryClassName.trim() ? primaryClassName : "text-[length:var(--ds-text-lg)]"}`.trim()}
          >
            {primaryText}
          </div>

          {secondaryText ? (
            <p className="m-0 mt-1.5 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              {secondaryText}
            </p>
          ) : null}

          {helperText ? (
            <p className="m-0 mt-1 text-[11px] leading-snug text-[var(--ds-text-muted)]">{helperText}</p>
          ) : null}

          {footer != null ? (
            <div className="mt-3 border-t border-[var(--ds-border)] pt-3 text-[length:var(--ds-text-sm)] text-[var(--ds-text-secondary)]">
              {footer}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
