"use client";

import Link from "next/link";
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
  RAIL_NAV_ROW_ACTIVE_CLASS,
  RAIL_NAV_ROW_INACTIVE_CLASS,
  RAIL_NAV_ROW_SHELL_CLASS,
  railLabelClass,
} from "@visualify/app-shell";
import { DashboardAccountMenu } from "./(hq)/dashboard/dashboard-account-menu";
import { WorkspaceRailList } from "./entity-rail-list";
import type { EntityRailWorkspace } from "@/lib/entity-rail-grouping";
import { VISUALIFY_APP_CATALOG } from "@/lib/visualify-apps";

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

function RailNavLink({
  href,
  label,
  pathname,
  children,
}: {
  href: string;
  label: string;
  pathname: string;
  children: React.ReactNode;
}) {
  const active = railNavHrefActive(pathname, href);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={RAIL_NAV_ROW_SHELL_CLASS + (active ? RAIL_NAV_ROW_ACTIVE_CLASS : RAIL_NAV_ROW_INACTIVE_CLASS)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">{children}</span>
      <span className={railLabelClass}>{label}</span>
    </Link>
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
}: {
  workspaces: EntityRailWorkspace[];
  selectedWorkspaceId: string | null;
}) {
  const pathname = usePathname();
  const accountRailActive = railNavHrefActive(pathname, "/account");

  return (
    <AppShellRail ariaLabel="Visualify HQ" pinnedStorageKey={HQ_PLATFORM_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="HQ"
            currentAppName="Visualify HQ"
            catalog={VISUALIFY_APP_CATALOG}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} />}
          />

          <AppShellRailSeparator />

          <nav className="flex flex-col gap-2.5" aria-label="Primary">
            <RailNavLink href="/dashboard" pathname={pathname} label="Dashboard">
              <IconDashboard />
            </RailNavLink>
          </nav>

          <WorkspaceRailList workspaces={workspaces} selectedWorkspaceId={selectedWorkspaceId} />
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <DashboardAccountMenu variant="rail" railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
