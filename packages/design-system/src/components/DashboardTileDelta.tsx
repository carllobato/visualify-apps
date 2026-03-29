import * as React from "react";
import { DashboardTile } from "./DashboardTile";
import type { DashboardTileAccent } from "./DashboardTile";

export type DashboardTileDeltaTone = "favorable" | "unfavorable" | "neutral" | "unknown";

export interface DashboardTileDeltaProps {
  label: string;
  value: string;
  tone?: DashboardTileDeltaTone;
  density?: "standard" | "compact";
  className?: string;
}

const toneToAccent: Record<DashboardTileDeltaTone, DashboardTileAccent> = {
  favorable: "success",
  unfavorable: "danger",
  neutral: "neutral",
  unknown: "neutral",
};

const valueTextClass: Record<DashboardTileDeltaTone, string> = {
  favorable: "text-[var(--ds-text-primary)]",
  unfavorable: "text-[var(--ds-text-primary)]",
  neutral: "text-[var(--ds-text-primary)]",
  unknown: "text-[var(--ds-text-muted)]",
};

export function DashboardTileDelta({
  label,
  value,
  tone = "neutral",
  density = "standard",
  className = "",
}: DashboardTileDeltaProps) {
  return (
    <DashboardTile accent={toneToAccent[tone]} density={density} className={className}>
      <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 text-[length:var(--ds-text-lg)] font-semibold leading-snug ${valueTextClass[tone]}`.trim()}
      >
        {value}
      </div>
    </DashboardTile>
  );
}
