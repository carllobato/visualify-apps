"use client";

import type { RiskLevel } from "@/domain/risk/risk.schema";

export const LEVEL_STYLES: Record<
  RiskLevel,
  { bg: string; dot: string; text: string }
> = {
  low: {
    bg: "var(--ds-risk-low-bg)",
    dot: "var(--ds-risk-low)",
    text: "var(--ds-risk-low-fg)",
  },
  medium: {
    bg: "var(--ds-risk-medium-bg)",
    dot: "var(--ds-risk-medium)",
    text: "var(--ds-risk-medium-fg)",
  },
  high: {
    bg: "var(--ds-risk-high-bg)",
    dot: "var(--ds-risk-high)",
    text: "var(--ds-risk-high-fg)",
  },
  extreme: {
    bg: "var(--ds-risk-critical-bg)",
    dot: "var(--ds-risk-critical)",
    text: "var(--ds-risk-critical-fg)",
  },
};

/** Softer green for Pre/Post rating "L" in table so it doesn’t clash with Mitigation Movement green. */
export const RATING_TABLE_LEVEL_STYLES: Record<
  RiskLevel,
  { bg: string; text: string }
> = {
  low: { bg: "var(--ds-risk-low-soft-bg)", text: "var(--ds-risk-low-fg)" },
  medium: { bg: "var(--ds-risk-medium-bg)", text: "var(--ds-risk-medium-fg)" },
  high: { bg: "var(--ds-risk-high-bg)", text: "var(--ds-risk-high-fg)" },
  extreme: { bg: "var(--ds-risk-critical-bg)", text: "var(--ds-risk-critical-fg)" },
};

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const s = LEVEL_STYLES[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: s.bg,
        color: s.text,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: s.dot,
        }}
      />
      {label}
    </span>
  );
}
