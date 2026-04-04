import * as React from "react";

export type BadgeStatus = "neutral" | "success" | "warning" | "danger" | "info";
export type BadgeVariant = "subtle" | "strong";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: BadgeStatus;
  variant?: BadgeVariant;
};

export function Badge({ className = "", status = "neutral", variant = "subtle", ...props }: BadgeProps) {
  const base =
    "inline-flex w-fit max-w-full shrink-0 items-center self-start rounded-full border px-2.5 py-1 text-[11px] font-medium";
  const statusStyles: Record<BadgeStatus, string> = {
    neutral: "bg-[var(--ds-status-neutral-subtle-bg)] text-[var(--ds-status-neutral-subtle-fg)] border-[var(--ds-status-neutral-subtle-border)]",
    success: "bg-[var(--ds-status-success-subtle-bg)] text-[var(--ds-status-success-subtle-fg)] border-[var(--ds-status-success-subtle-border)]",
    warning: "bg-[var(--ds-status-warning-subtle-bg)] text-[var(--ds-status-warning-subtle-fg)] border-[var(--ds-status-warning-subtle-border)]",
    danger: "bg-[var(--ds-status-danger-subtle-bg)] text-[var(--ds-status-danger-subtle-fg)] border-[var(--ds-status-danger-subtle-border)]",
    info: "bg-[var(--ds-status-info-subtle-bg)] text-[var(--ds-status-info-subtle-fg)] border-[var(--ds-status-info-subtle-border)]",
  };
  const strongStatusStyles: Record<BadgeStatus, string> = {
    neutral: "bg-[var(--ds-status-neutral-strong-bg)] text-[var(--ds-status-neutral-strong-fg)] border-[var(--ds-status-neutral-strong-border)]",
    success: "bg-[var(--ds-status-success-strong-bg)] text-[var(--ds-status-success-strong-fg)] border-[var(--ds-status-success-strong-border)]",
    warning: "bg-[var(--ds-status-warning-strong-bg)] text-[var(--ds-status-warning-strong-fg)] border-[var(--ds-status-warning-strong-border)]",
    danger: "bg-[var(--ds-status-danger-strong-bg)] text-[var(--ds-status-danger-strong-fg)] border-[var(--ds-status-danger-strong-border)]",
    info: "bg-[var(--ds-status-info-strong-bg)] text-[var(--ds-status-info-strong-fg)] border-[var(--ds-status-info-strong-border)]",
  };
  const visualVariants: Record<BadgeVariant, Record<BadgeStatus, string>> = {
    subtle: statusStyles,
    strong: strongStatusStyles,
  };

  return <span className={`${base} ${visualVariants[variant][status]} ${className}`} {...props} />;
}

