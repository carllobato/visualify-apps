import * as React from "react";

export type TrendSentiment = "favorable" | "unfavorable" | "neutral";
export type TrendVariant = "default" | "card" | "attention";
/** @deprecated Trend arrows no longer render hover callouts. */
export type TrendTooltipPlacement = "above" | "below";

export interface TrendProps {
  /** Optional description for assistive technology. */
  children?: React.ReactNode;
  sentiment?: TrendSentiment;
  /** @deprecated Trend renders as an arrow indicator; variant is ignored. */
  variant?: TrendVariant;
  /** @deprecated Trend arrows no longer render hover callouts. */
  tooltipPlacement?: TrendTooltipPlacement;
  className?: string;
}

const arrowColorClass: Record<TrendSentiment, string> = {
  unfavorable: "text-[var(--ds-status-danger-fg)]",
  neutral: "text-[var(--ds-text-muted)]",
  favorable: "text-[var(--ds-status-success-fg)]",
};

const arrowLabel: Record<TrendSentiment, string> = {
  unfavorable: "Worsening trend",
  neutral: "Unchanged trend",
  favorable: "Improving trend",
};

function TrendArrowIcon({ sentiment }: { sentiment: TrendSentiment }) {
  const className = `size-3.5 shrink-0 ${arrowColorClass[sentiment]}`;

  if (sentiment === "unfavorable") {
    return (
      <svg viewBox="0 0 12 12" className={className} aria-hidden>
        <path fill="currentColor" d="M6 2.5 9.5 8H2.5L6 2.5Z" />
        <rect x="5.25" y="8" width="1.5" height="2.5" rx="0.25" fill="currentColor" />
      </svg>
    );
  }

  if (sentiment === "favorable") {
    return (
      <svg viewBox="0 0 12 12" className={className} aria-hidden>
        <path fill="currentColor" d="M6 9.5 2.5 4h7L6 9.5Z" />
        <rect x="5.25" y="1.5" width="1.5" height="2.5" rx="0.25" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M2.5 6h5.5M7.5 4.25 9.75 6 7.5 7.75"
      />
    </svg>
  );
}

export function Trend({ children, sentiment = "neutral", className = "" }: TrendProps) {
  const description = typeof children === "string" ? children : undefined;

  return (
    <span
      className={["inline-flex shrink-0 align-middle", className].filter(Boolean).join(" ")}
      aria-label={description ? `${arrowLabel[sentiment]}: ${description}` : arrowLabel[sentiment]}
    >
      <TrendArrowIcon sentiment={sentiment} />
    </span>
  );
}
