import * as React from "react";
import { DashboardTile } from "./DashboardTile";

export type DashboardTileStatusTone = "success" | "warning" | "danger" | "neutral";

export interface DashboardTileStatusProps {
  label: string;
  value: string;
  tone?: DashboardTileStatusTone;
  density?: "standard" | "compact";
  className?: string;
}

const valueTextClass: Record<DashboardTileStatusTone, string> = {
  success: "text-[var(--ds-status-success-fg)]",
  warning: "text-[var(--ds-status-warning-fg)]",
  danger: "text-[var(--ds-status-danger-fg)]",
  neutral: "text-[var(--ds-text-primary)]",
};

export function DashboardTileStatus({
  label,
  value,
  tone = "neutral",
  density = "standard",
  className = "",
}: DashboardTileStatusProps) {
  return (
    <DashboardTile accent={tone} density={density} className={className}>
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
