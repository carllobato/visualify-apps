import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

/** Flat underline tabs — no segmented pill track or elevated active chip. */
export function Tabs({ className = "", ...props }: DivProps) {
  const base = "inline-flex flex-wrap items-end gap-x-1 gap-y-0 bg-transparent";
  return <div role="tablist" className={`${base} ${className}`} {...props} />;
}

export function Tab({ className = "", active = false, type = "button", ...props }: ButtonProps) {
  const base =
    "relative cursor-pointer rounded-none px-3 py-2 text-[length:var(--ds-text-sm)] font-medium transition-colors " +
    "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:content-[''] " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)] " +
    "disabled:cursor-not-allowed";
  const state = active
    ? "font-semibold text-[var(--ds-text-primary)] after:bg-[var(--ds-text-primary)]"
    : "text-[var(--ds-text-secondary)] after:bg-transparent hover:text-[var(--ds-text-primary)] " +
        "hover:bg-[var(--ds-surface-hover)] hover:rounded-t-[var(--ds-radius-sm)]";
  return <button role="tab" aria-selected={active} type={type} className={`${base} ${state} ${className}`} {...props} />;
}
