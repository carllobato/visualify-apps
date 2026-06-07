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
  AppShellRailNavLink,
  AppShellRailNavSection,
  AppShellRailSeparator,
  appShellNavHrefActive,
  appShellRailPrimaryNavClassName,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import {
  CONTROLAI_PRIMARY_NAV,
  CONTROLAI_ROUTES,
  controlaiProjectPath,
  isControlAIProjectOverviewPath,
  isControlAIProjectSegmentPath,
  isControlAIProjectsListPath,
  projectIdFromPathname,
  type ControlAIProjectNavSegment,
} from "@/lib/controlai-routes";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";
import { ControlAiRailAccountMenu } from "./ControlAiRailAccountMenu";
import { ControlAiWorkspaceRailList } from "./ControlAiWorkspaceRailList";

const CONTROLAI_RAIL_PINNED_KEY = "controlai-platform-rail-pinned";

const VISUALIFY_BRAND_ICON_SRC = "/visualify-brand-mark.png";

type RailPrimaryNavKey =
  | "dashboard"
  | "projects"
  | "settings"
  | "projectOverview"
  | "projectCost"
  | "projectTime"
  | "projectRisk"
  | "projectReport"
  | "projectSettings";

/** Single stroke weight for all rail glyphs (workspace + project). */
const RAIL_ICON_STROKE = 1.5;

const railIconSvgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: RAIL_ICON_STROKE,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "shrink-0",
};

function IconDashboard() {
  return (
    <svg {...railIconSvgProps}>
      <rect x={3} y={3} width={8} height={8} rx={1} />
      <rect x={13} y={3} width={8} height={5} rx={1} />
      <rect x={13} y={10} width={8} height={11} rx={1} />
      <rect x={3} y={13} width={8} height={8} rx={1} />
    </svg>
  );
}

function IconProjects() {
  return (
    <svg {...railIconSvgProps}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x={9} y={3} width={6} height={4} rx={1} />
    </svg>
  );
}

/** Lucide settings cog — workspace and project Settings. */
function IconSettings() {
  return (
    <svg {...railIconSvgProps}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconProjectOverview() {
  return (
    <svg {...railIconSvgProps}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

/** Circle-dollar — $ inside a ring. */
function IconCost() {
  return (
    <svg {...railIconSvgProps}>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 6v12" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
    </svg>
  );
}

function IconTime() {
  return (
    <svg {...railIconSvgProps}>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconRisk() {
  return (
    <svg {...railIconSvgProps}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg {...railIconSvgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M12 13h4" />
      <path d="M12 17h4" />
    </svg>
  );
}

function projectNavIcon(segment: ControlAIProjectNavSegment | null) {
  switch (segment) {
    case null:
      return <IconProjectOverview />;
    case "cost":
      return <IconCost />;
    case "time":
      return <IconTime />;
    case "risk":
      return <IconRisk />;
    case "report":
      return <IconReport />;
    case "settings":
      return <IconSettings />;
    default:
      return <IconProjectOverview />;
  }
}

function navIcon(href: string) {
  switch (href) {
    case CONTROLAI_ROUTES.dashboard:
      return <IconDashboard />;
    case CONTROLAI_ROUTES.projects:
      return <IconProjects />;
    case CONTROLAI_ROUTES.settings:
      return <IconSettings />;
    default:
      return <IconDashboard />;
  }
}

function resolveActivePrimaryNav(pathname: string, projectId: string | null): RailPrimaryNavKey | null {
  if (projectId) {
    if (isControlAIProjectSegmentPath(pathname, projectId, "settings")) return "projectSettings";
    if (isControlAIProjectSegmentPath(pathname, projectId, "report")) return "projectReport";
    if (isControlAIProjectSegmentPath(pathname, projectId, "risk")) return "projectRisk";
    if (isControlAIProjectSegmentPath(pathname, projectId, "time")) return "projectTime";
    if (isControlAIProjectSegmentPath(pathname, projectId, "cost")) return "projectCost";
    if (isControlAIProjectOverviewPath(pathname, projectId)) return "projectOverview";
  }

  if (appShellNavHrefActive(pathname, CONTROLAI_ROUTES.settings)) return "settings";
  if (isControlAIProjectsListPath(pathname)) return "projects";
  if (appShellNavHrefActive(pathname, CONTROLAI_ROUTES.dashboard)) return "dashboard";
  return null;
}

const PROJECT_NAV_ITEMS: { segment: ControlAIProjectNavSegment | null; label: string; key: RailPrimaryNavKey }[] =
  [
    { segment: null, label: "Overview", key: "projectOverview" },
    { segment: "cost", label: "Cost", key: "projectCost" },
    { segment: "time", label: "Time", key: "projectTime" },
    { segment: "risk", label: "Risk", key: "projectRisk" },
    { segment: "report", label: "Report", key: "projectReport" },
    { segment: "settings", label: "Settings", key: "projectSettings" },
  ];

type ControlAiAppShellRailProps = {
  workspaces: EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  appCatalog: readonly AppShellRailAppCatalogEntry[];
};

export function ControlAiAppShellRail({
  workspaces,
  selectedWorkspaceId,
  appCatalog,
}: ControlAiAppShellRailProps) {
  const pathname = usePathname();
  const projectIdInUrl = projectIdFromPathname(pathname);
  const activeNav = resolveActivePrimaryNav(pathname, projectIdInUrl);
  const accountRailActive = appShellNavHrefActive(pathname, CONTROLAI_ROUTES.account);

  return (
    <AppShellRail ariaLabel="ControlAI navigation" pinnedStorageKey={CONTROLAI_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="ControlAI"
            currentAppId="controlai"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark src={VISUALIFY_BRAND_ICON_SRC} alt="" />}
          />

          <AppShellRailSeparator />

          <ControlAiWorkspaceRailList
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceId}
          />

          <AppShellRailSeparator />

          <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
            {CONTROLAI_PRIMARY_NAV.map(({ href, label }) => (
              <AppShellRailNavLink
                key={href}
                href={href}
                active={
                  href === CONTROLAI_ROUTES.dashboard
                    ? activeNav === "dashboard"
                    : href === CONTROLAI_ROUTES.projects
                      ? activeNav === "projects"
                      : activeNav === "settings"
                }
                label={label}
              >
                {navIcon(href)}
              </AppShellRailNavLink>
            ))}

            {projectIdInUrl ? (
              <AppShellRailNavSection label="Project">
                {PROJECT_NAV_ITEMS.map(({ segment, label, key }) => (
                  <AppShellRailNavLink
                    key={key}
                    href={controlaiProjectPath(projectIdInUrl, segment ?? undefined)}
                    active={activeNav === key}
                    label={label}
                  >
                    {projectNavIcon(segment)}
                  </AppShellRailNavLink>
                ))}
              </AppShellRailNavSection>
            ) : null}
          </nav>
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <ControlAiRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
