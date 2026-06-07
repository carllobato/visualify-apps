"use client";

import { usePathname } from "next/navigation";
import { AppShellRailNavLink, appShellRailPrimaryNavClassName, railSubLabelClass } from "@visualify/app-shell";
import { reportProjectReportPath, reportProjectIdFromPathname } from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

/** Lucide file-bar-chart — outline when inactive, filled when active. */
function IconReport({ active }: { active: boolean }) {
  if (active) {
    return (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-[var(--ds-text-primary)]">
        <path
          d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
          fill="currentColor"
          stroke="none"
        />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" fill="currentColor" stroke="none" />
        <path
          d="M8 18v-2M12 18v-4M16 18v-6"
          stroke="var(--ds-surface)"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-current">
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v4a2 2 0 0 0 2 2h4M8 18v-2M12 18v-4M16 18v-6"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type ReportProjectRailListProps = {
  projects: ReportProjectListItem[];
};

export function ReportProjectRailList({ projects }: ReportProjectRailListProps) {
  const pathname = usePathname();
  const activeProjectId = reportProjectIdFromPathname(pathname);

  return (
    <nav className={appShellRailPrimaryNavClassName} aria-label="Projects">
      {projects.map((project) => {
        const active = activeProjectId === project.id;
        return (
          <AppShellRailNavLink
            key={project.id}
            href={reportProjectReportPath(project.id)}
            active={active}
            label={project.name}
            labelClassName={railSubLabelClass}
          >
            <IconReport active={active} />
          </AppShellRailNavLink>
        );
      })}
    </nav>
  );
}
