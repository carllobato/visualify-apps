import * as React from "react";
import { DashboardTile } from "./DashboardTile";

export interface DashboardTileKpiProps {
  label: string;
  value: string;
  helperText?: string;
  accent?: "success" | "warning" | "danger" | "neutral" | "none";
  density?: "standard" | "compact";
  className?: string;
}

export function DashboardTileKpi({
  label,
  value,
  helperText,
  accent = "none",
  density = "standard",
  className = "",
}: DashboardTileKpiProps) {
  return (
    <DashboardTile accent={accent} density={density} className={className}>
      <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-[length:var(--ds-text-2xl)] font-semibold tabular-nums text-[var(--ds-text-primary)]">
        {value}
      </div>
      {helperText != null && helperText !== "" ? (
        <div className="mt-0.5 text-[length:var(--ds-text-xs)] font-normal normal-case tracking-normal text-[var(--ds-text-muted)]">
          {helperText}
        </div>
      ) : null}
    </DashboardTile>
  );
}
