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
  AppShellRailNavLink,
  appShellRailPrimaryNavClassName,
} from "@visualify/app-shell";
import { DashboardAccountMenu } from "./(hq)/dashboard/dashboard-account-menu";
import { HqRailFooterHelp } from "@/components/hq-rail-footer-help";
import { WorkspaceRailList } from "./entity-rail-list";
import type { EntityRailWorkspace } from "@/lib/entity-rail-grouping";
import type { VisualifyAppDefinition } from "@/lib/visualify-apps";

/** Persist pin preference — each HQ page mounts its own shell, so state must survive remounts. */
const HQ_PLATFORM_RAIL_PINNED_KEY = "hq-platform-rail-pinned";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

/** Same matching rules as Next `<Link>` active styles for primary nav items. */
function railNavHrefActive(pathname: string, href: string): boolean {
  const pathOnly = href.split("#")[0] ?? href;
  return (
    pathname === pathOnly ||
    (pathOnly.length > 1 && pathname.startsWith(`${pathOnly}/`))
  );
}

function IconDashboard() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <rect x={3} y={3} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={3} width={8} height={5} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={13} y={10} width={8} height={11} rx={1} stroke="currentColor" strokeWidth={1.5} />
      <rect x={3} y={13} width={8} height={8} rx={1} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function PlatformRail({
  workspaces,
  selectedWorkspaceId,
  appCatalog,
}: {
  workspaces: EntityRailWorkspace[];
  selectedWorkspaceId: string | null;
  appCatalog: readonly VisualifyAppDefinition[];
}) {
  const pathname = usePathname();
  const accountRailActive = railNavHrefActive(pathname, "/account");

  return (
    <AppShellRail ariaLabel="Visualify HQ" pinnedStorageKey={HQ_PLATFORM_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="HQ"
            currentAppName="HQ"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} />}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            <AppShellRailNavLink
              href="/dashboard"
              active={railNavHrefActive(pathname, "/dashboard")}
              label="Dashboard"
            >
              <IconDashboard />
            </AppShellRailNavLink>
          </nav>

          <WorkspaceRailList workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <HqRailFooterHelp />
          <AppShellRailFooterAccount>
            <DashboardAccountMenu variant="rail" railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
