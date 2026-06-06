"use client";

import { usePathname } from "next/navigation";
import { AppShellRailNavLink, appShellRailPrimaryNavClassName } from "@visualify/app-shell";
import { reportProjectReportPath, reportProjectIdFromPathname } from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

function IconReport() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h2M8 17h2M12 13h4M12 17h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
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
      {projects.map((project) => (
        <AppShellRailNavLink
          key={project.id}
          href={reportProjectReportPath(project.id)}
          active={activeProjectId === project.id}
          label={project.name}
        >
          <IconReport />
        </AppShellRailNavLink>
      ))}
    </nav>
  );
}
