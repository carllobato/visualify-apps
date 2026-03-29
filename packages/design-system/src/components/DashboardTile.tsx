import * as React from "react";
import { Card, CardContent } from "./Card";

export type DashboardTileAccent = "success" | "warning" | "danger" | "neutral" | "none";
export type DashboardTileDensity = "standard" | "compact";

export interface DashboardTileProps {
  children: React.ReactNode;
  accent?: DashboardTileAccent;
  density?: DashboardTileDensity;
  className?: string;
}

const accentBandClass: Record<Exclude<DashboardTileAccent, "none">, string> = {
  success: "bg-[var(--ds-status-success)]",
  warning: "bg-[var(--ds-status-warning)]",
  danger: "bg-[var(--ds-status-danger)]",
  neutral: "bg-[var(--ds-border)]",
};

export function DashboardTile({
  children,
  accent = "none",
  density = "standard",
  className = "",
}: DashboardTileProps) {
  const paddingClass =
    density === "compact"
      ? "p-[var(--ds-dashboard-tile-padding-compact)]"
      : "p-[var(--ds-dashboard-tile-padding)]";

  return (
    <Card className={className}>
      <CardContent className={paddingClass}>
        {accent !== "none" ? (
          <div
            className={`mb-2 h-[var(--ds-dashboard-accent-band-height)] w-full shrink-0 rounded-[var(--ds-dashboard-accent-band-radius)] ${accentBandClass[accent]}`.trim()}
            aria-hidden
          />
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
