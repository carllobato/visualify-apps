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
import { REPORT_ROUTES } from "@/lib/report-routes";
import type { ReportProjectListItem } from "@/lib/projects/report-projects-server";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";
import { ReportProjectRailList } from "./ReportProjectRailList";
import { ReportRailAccountMenu } from "./ReportRailAccountMenu";
import { ReportWorkspaceRailList } from "./ReportWorkspaceRailList";

const REPORT_RAIL_PINNED_KEY = "report-platform-rail-pinned";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

type ReportAppShellRailProps = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  projects: ReportProjectListItem[];
  appCatalog: readonly AppShellRailAppCatalogEntry[];
};

/**
 * Report platform rail — product menu, workspace selector, alphabetical project list, account.
 */
export function ReportAppShellRail({
  workspaces,
  selectedWorkspaceId,
  projects,
  appCatalog,
}: ReportAppShellRailProps) {
  const pathname = usePathname();
  const accountRailActive = appShellNavHrefActive(pathname, REPORT_ROUTES.account);

  return (
    <AppShellRail ariaLabel="Report navigation" pinnedStorageKey={REPORT_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="Report"
            currentAppName="Visualify Report"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
          />

          <AppShellRailSeparator />

          <ReportWorkspaceRailList
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
          />

          <AppShellRailSeparator />

          <ReportProjectRailList projects={projects} />
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
