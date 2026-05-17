"use client";

import type { ReactNode } from "react";
import { appShellRailFooterAccountOuterTailwindClassName } from "./rail-layout-classes";
import { appShellRailIconWellClassName, railLabelClass } from "./rail-row-classes";
import { appShellRailFooterControlRowClass } from "./rail-footer-row-classes";

function HelpCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function mergeClass(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export type AppShellRailFooterHelpProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Always-visible footer slot for Help (expands with rail width like the account row).
 * Place inside {@link AppShellRailFooter}, typically above {@link AppShellRailFooterAccount}.
 */
export function AppShellRailFooterHelp({ children, className }: AppShellRailFooterHelpProps) {
  return (
    <div className={mergeClass(appShellRailFooterAccountOuterTailwindClassName, className)}>
      {children}
    </div>
  );
}

export type AppShellRailFooterHelpTriggerProps = {
  onClick: () => void;
  /** Defaults to “Help & Feedback”. */
  label?: string;
};

/** Footer Help control — same row chrome as pin/collapse. */
export function AppShellRailFooterHelpTrigger({
  onClick,
  label = "Help & Feedback",
}: AppShellRailFooterHelpTriggerProps) {
  return (
    <button
      type="button"
      className={appShellRailFooterControlRowClass(false)}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <span className={appShellRailIconWellClassName}>
        <HelpCircleIcon />
      </span>
      <span className={railLabelClass}>{label}</span>
    </button>
  );
}
