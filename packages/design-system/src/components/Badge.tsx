import * as React from "react";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className = "", variant = "neutral", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";

  const variants: Record<BadgeVariant, string> = {
    neutral: "bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200",
    success: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200",
    warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200",
    danger: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
  };

  return <span className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

