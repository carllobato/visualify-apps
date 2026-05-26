import type { ReactNode } from "react";
import { appShellRailRuleClassName } from "./rail-layout-classes";
import {
  appShellRailMobileOpenSectionHeadingRevealClassName,
  appShellRailMobileOpenSectionRuleHideClassName,
} from "./rail-mobile-classes";
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
  "group-data-[pinned=true]:max-w-[11rem] group-data-[pinned=true]:w-auto group-data-[pinned=true]:opacity-100 " +
  appShellRailMobileOpenSectionHeadingRevealClassName;

const sectionHeadingLineClass =
  `pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 ${appShellRailRuleClassName} ` +
  "opacity-100 transition-[max-width,opacity] duration-[400ms] ease-out " +
  "group-hover:opacity-0 group-data-[pinned=true]:opacity-0 " +
  appShellRailMobileOpenSectionRuleHideClassName;

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
      <div className="relative flex h-10 w-full min-w-0 shrink-0 items-end">
        <div className="relative w-full min-w-0 leading-none">
          <div className={sectionHeadingLineClass} aria-hidden />
          <span
            className={`ds-sidebar-section-header ds-sidebar-section-header-label leading-none ${sectionHeadingRevealClass}`}
          >
            {label}
          </span>
        </div>
      </div>
      {children}
    </section>
  );
}
