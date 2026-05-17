import type { ReactNode } from "react";
import { appShellRailEntitySectionClassName } from "./rail-row-classes";

type AppShellRailNavSectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const sectionHeadingRevealClass =
  "relative z-10 block min-w-0 overflow-hidden whitespace-nowrap " +
  "w-0 max-w-0 opacity-0 transition-[max-width,opacity] duration-[400ms] ease-out " +
  "group-hover:max-w-[11rem] group-hover:w-auto group-hover:opacity-100 " +
  "group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:w-auto group-data-[pinned=true]:opacity-100";

const sectionHeadingRuleClass =
  "pointer-events-none absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 " +
  "bg-[var(--ds-status-neutral-subtle-border)] opacity-100 transition-opacity duration-[400ms] ease-out " +
  "group-hover:opacity-0 group-data-[pinned=true]:opacity-0";

/**
 * Grouped primary nav with a section heading (e.g. Portfolio, Projects).
 * Heading collapses to a rule when the rail is icon-only; label reveals on hover or pin.
 */
export function AppShellRailNavSection({ label, children, className }: AppShellRailNavSectionProps) {
  const rootClass = className
    ? `${appShellRailEntitySectionClassName} ${className}`
    : appShellRailEntitySectionClassName;

  return (
    <section className={rootClass} aria-label={label}>
      <div className="pb-0.5 pt-1">
        <div className="relative h-4">
          <div className={sectionHeadingRuleClass} aria-hidden />
          <span className={`ds-sidebar-section-header ds-sidebar-section-header-label ${sectionHeadingRevealClass}`}>
            {label}
          </span>
        </div>
      </div>
      {children}
    </section>
  );
}
