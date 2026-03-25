import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Tabs({ className = "", ...props }: DivProps) {
  const base =
    "inline-flex items-center gap-1 rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-1";
  return <div role="tablist" className={`${base} ${className}`} {...props} />;
}

export function Tab({ className = "", active = false, type = "button", ...props }: ButtonProps) {
  const base =
    "rounded-[calc(var(--ds-radius-md)-4px)] px-3 py-1.5 text-[length:var(--ds-text-sm)] font-medium transition-colors";
  const state = active
    ? "bg-[var(--ds-surface-elevated)] text-[var(--ds-text-primary)] shadow-[var(--ds-shadow-sm)]"
    : "text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]";
  return <button role="tab" aria-selected={active} type={type} className={`${base} ${state} ${className}`} {...props} />;
}
