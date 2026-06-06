"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileHeader,
  AppShellRailBrandMark,
  AppShellScrollRegion,
  appShellNavHrefActive,
} from "@visualify/app-shell";
import {
  isReportProjectsListPath,
  reportProjectIdFromPathname,
  REPORT_ROUTES,
} from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

function reportMobilePageTitle(pathname: string, projects: ReportProjectListItem[]): string {
  if (isReportProjectsListPath(pathname)) {
    return "Projects";
  }

  const projectId = reportProjectIdFromPathname(pathname);
  if (projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      return project.name;
    }
    return "Report";
  }

  if (appShellNavHrefActive(pathname, REPORT_ROUTES.account)) {
    return "Account";
  }
  if (appShellNavHrefActive(pathname, REPORT_ROUTES.selectWorkspace)) {
    return "Workspace";
  }
  return "Report";
}

type ReportProtectedDocumentProps = {
  children: ReactNode;
  projects: ReportProjectListItem[];
};

export function ReportProtectedDocument({ children, projects }: ReportProtectedDocumentProps) {
  const pathname = usePathname();
  const pageTitle = reportMobilePageTitle(pathname, projects);

  return (
    <AppShellMainColumn>
      <AppShellMobileHeader
        appName="Report"
        pageTitle={pageTitle}
        appIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
      />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>{children}</AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
    </AppShellMainColumn>
  );
}
