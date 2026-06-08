"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppShellFrameGutter,
  AppShellFramedSurface,
  AppShellMainColumn,
  AppShellMobileBottomNav,
  AppShellPageTransition,
  AppShellRouteTransitionEffect,
  AppShellScrollRegion,
} from "@visualify/app-shell";
import { ReportMobileHeader } from "@/components/layout/ReportMobileHeader";
import { ReportMobileMoreSheet } from "@/components/layout/ReportMobileMoreSheet";
import { buildReportMobileBottomNavItems } from "@/lib/report-mobile-bottom-nav";
import { useReportLastProjectIdForWorkspace } from "@/lib/projects/useReportLastProjectIdForWorkspace";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";

type ReportProtectedDocumentProps = {
  children: ReactNode;
  projects: ReportProjectListItem[];
  selectedWorkspaceId: string | null;
};

export function ReportProtectedDocument({
  children,
  projects,
  selectedWorkspaceId,
}: ReportProtectedDocumentProps) {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const lastUsedProjectId = useReportLastProjectIdForWorkspace(selectedWorkspaceId, pathname);

  useEffect(() => {
    setMoreMenuOpen(false);
  }, [pathname]);
  const bottomNavItems = buildReportMobileBottomNavItems(pathname, projects, lastUsedProjectId, {
    moreOnPress: () => setMoreMenuOpen((open) => !open),
    morePressed: moreMenuOpen,
  });

  return (
    <AppShellMainColumn>
      <AppShellRouteTransitionEffect />
      <ReportMobileHeader />
      <AppShellFrameGutter>
        <AppShellFramedSurface>
          <AppShellScrollRegion>
            <AppShellPageTransition>{children}</AppShellPageTransition>
          </AppShellScrollRegion>
        </AppShellFramedSurface>
      </AppShellFrameGutter>
      <AppShellMobileBottomNav items={bottomNavItems} ariaLabel="Report primary" />
      <ReportMobileMoreSheet open={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />
    </AppShellMainColumn>
  );
}
