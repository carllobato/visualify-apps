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
  const className = `block size-[1em] shrink-0 ${arrowColorClass[sentiment]}`;

  if (sentiment === "unfavorable") {
    return (
      <svg viewBox="0 0 12 12" className={className} aria-hidden>
        <path fill="currentColor" d="M6 2.75 9.25 7.25H2.75L6 2.75Z" />
        <rect x="5.35" y="7.25" width="1.3" height="2" rx="0.2" fill="currentColor" />
      </svg>
    );
  }

  if (sentiment === "favorable") {
    return (
      <svg viewBox="0 0 12 12" className={className} aria-hidden>
        <rect x="5.35" y="2.75" width="1.3" height="2" rx="0.2" fill="currentColor" />
        <path fill="currentColor" d="M6 9.25 2.75 4.75h6.5L6 9.25Z" />
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
      className={[
        "inline-flex shrink-0 items-center justify-center leading-none [font-size:inherit]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={description ? `${arrowLabel[sentiment]}: ${description}` : arrowLabel[sentiment]}
    >
      <TrendArrowIcon sentiment={sentiment} />
    </span>
  );
}
