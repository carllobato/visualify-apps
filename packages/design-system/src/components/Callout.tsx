import * as React from "react";

type CalloutStatus = "neutral" | "success" | "warning" | "danger" | "info";

export type CalloutProps = React.HTMLAttributes<HTMLDivElement> & {
  status?: CalloutStatus;
};

export function Callout({ className = "", status = "neutral", ...props }: CalloutProps) {
  const base = "rounded-[var(--ds-radius-md)] border px-4 py-3";
  const statuses: Record<CalloutStatus, string> = {
    neutral:
      "bg-[var(--ds-status-neutral-subtle-bg)] border-[var(--ds-status-neutral-subtle-border)] text-[var(--ds-status-neutral-subtle-fg)]",
    info: "bg-[var(--ds-status-info-subtle-bg)] border-[var(--ds-status-info-subtle-border)] text-[var(--ds-status-info-subtle-fg)]",
    warning:
      "bg-[var(--ds-status-warning-subtle-bg)] border-[var(--ds-status-warning-subtle-border)] text-[var(--ds-status-warning-subtle-fg)]",
    danger:
      "bg-[var(--ds-status-danger-subtle-bg)] border-[var(--ds-status-danger-subtle-border)] text-[var(--ds-status-danger-subtle-fg)]",
    success:
      "bg-[var(--ds-status-success-subtle-bg)] border-[var(--ds-status-success-subtle-border)] text-[var(--ds-status-success-subtle-fg)]",
  };
  return <div className={`${base} ${statuses[status]} ${className}`} {...props} />;
}
