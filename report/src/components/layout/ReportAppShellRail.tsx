"use client";

import { usePathname } from "next/navigation";
import {
  AppShellRail,
  AppShellRailBody,
  AppShellRailBrandAppMenu,
  AppShellRailBrandMark,
  AppShellRailFooter,
  AppShellRailFooterAccount,
  AppShellRailHeader,
  AppShellRailSeparator,
  appShellNavHrefActive,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import { isReportHomePath, REPORT_ROUTES } from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";
import { ReportProjectRailList } from "./ReportProjectRailList";
import { ReportRailAccountMenu } from "./ReportRailAccountMenu";
import { ReportWorkspaceRailList } from "./ReportWorkspaceRailList";

const REPORT_RAIL_PINNED_KEY = "report-platform-rail-pinned";

type ReportAppShellRailProps = {
  selectedWorkspaceId: string | null;
  projects: ReportProjectListItem[];
  appCatalog: readonly AppShellRailAppCatalogEntry[];
  /** Hide workspace and project nav (home screen). */
  emptyPrimaryNav?: boolean;
};

/**
 * Report platform rail — product menu, workspace selector, alphabetical project list, account.
 */
export function ReportAppShellRail({
  workspaces,
  selectedWorkspaceId,
  projects,
  appCatalog,
  emptyPrimaryNav: emptyPrimaryNavProp,
}: ReportAppShellRailProps) {
  const pathname = usePathname();
  const accountRailActive = appShellNavHrefActive(pathname, REPORT_ROUTES.account);
  const emptyPrimaryNav = emptyPrimaryNavProp ?? isReportHomePath(pathname);

  return (
    <AppShellRail ariaLabel="Report navigation" pinnedStorageKey={REPORT_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="Report"
            currentAppId="report"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark alt="" />}
          />

          {emptyPrimaryNav ? null : (
            <>
              <AppShellRailSeparator />

              <ReportWorkspaceRailList
                workspaces={workspaces}
                selectedWorkspaceId={selectedWorkspaceId}
              />

              <ReportProjectRailList projects={projects} />
            </>
          )}
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <ReportRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
