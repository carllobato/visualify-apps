import * as React from "react";
import { Card, CardContent } from "./Card";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export interface StatusBlockProps {
  label: string;
  value: string;
  tone?: StatusTone;
  className?: string;
}

const bandClass: Record<StatusTone, string> = {
  success: "bg-[var(--ds-status-success)]",
  warning: "bg-[var(--ds-status-warning)]",
  danger: "bg-[var(--ds-status-danger)]",
  neutral: "bg-[var(--ds-border)]",
};

const valueTextClass: Record<StatusTone, string> = {
  success: "text-[var(--ds-status-success-fg)]",
  warning: "text-[var(--ds-status-warning-fg)]",
  danger: "text-[var(--ds-status-danger-fg)]",
  neutral: "text-[var(--ds-text-primary)]",
};

export function StatusBlock({ label, value, tone = "neutral", className = "" }: StatusBlockProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div
          className={`mb-2 h-0.5 w-full shrink-0 rounded-full ${bandClass[tone]}`.trim()}
          aria-hidden
        />
        <div className="text-[length:var(--ds-text-xs)] font-medium uppercase tracking-wide text-[var(--ds-text-muted)]">
          {label}
        </div>
        <div
          className={`mt-1 text-[length:var(--ds-text-lg)] font-semibold leading-snug ${valueTextClass[tone]}`.trim()}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
