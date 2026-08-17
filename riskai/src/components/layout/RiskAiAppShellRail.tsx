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
  AppShellRailNavScroll,
  AppShellRailNavSection,
  AppShellRailSeparator,
  appShellRailPrimaryNavClassName,
  type AppShellRailAppCatalogEntry,
} from "@visualify/app-shell";
import {
  HOME_PATH,
  projectIdFromAppPathname,
  riskaiPath,
  shouldHideAppShellPrimaryNav,
  stripLegacyRiskAiPrefix,
  workspaceIdFromAppPathname,
} from "@/lib/routes";
import { RiskAiRailAccountMenu } from "@/components/layout/RiskAiRailAccountMenu";
import { RiskAiWorkspaceRailList } from "@/components/layout/RiskAiWorkspaceRailList";
import { useProjectWorkspaceId } from "@/hooks/useProjectWorkspaceId";
import {
  resolveActivePrimaryNav,
  riskAiProjectRailHrefs,
} from "@/lib/layout/resolveRiskAiRailActiveNav";
import { resolveRailWorkspace } from "@/lib/workspace/resolveRailWorkspace";
import type { EntitledWorkspace } from "@/types/entitledWorkspace";

const RISKAI_APP_SHELL_RAIL_PINNED_KEY = "riskai-app-shell-rail-pinned";

const ACCOUNT_SETTINGS_HREF = riskaiPath("/account");

function normalizePathname(pathname: string): string {
  if (!pathname) return "";
  const flat = stripLegacyRiskAiPrefix(pathname);
  return flat.replace(/\/+$/, "") || flat;
}

function pathEqualsOrStartsWith(pathname: string, base: string): boolean {
  const p = normalizePathname(pathname);
  const b = normalizePathname(base);
  return p === b || p.startsWith(`${b}/`);
}

function isAccountSettingsRouteActive(pathname: string): boolean {
  return pathEqualsOrStartsWith(pathname, ACCOUNT_SETTINGS_HREF);
}

function IconProjectsList() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconProjectOverview() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0"
      aria-hidden
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconRisks() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="shrink-0"
      aria-hidden
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconSimulation() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M12 13h4" />
      <path d="M12 17h4" />
    </svg>
  );
}

type RiskAiAppShellRailProps = {
  workspaces: readonly EntitledWorkspace[];
  selectedWorkspaceId: string | null;
  appCatalog: readonly AppShellRailAppCatalogEntry[];
  /** Hide Workspace/Project nav on `/home` and until a workspace is selected. */
  hidePrimaryNav?: boolean;
};

/**
 * RiskAI platform rail — compound `@visualify/app-shell` layout (HQ-aligned) with RiskAI nav destinations.
 * Shown when `NEXT_PUBLIC_RISKAI_ENABLE_APP_SHELL=1` via `ProtectedShell`.
 */
export function RiskAiAppShellRail({
  workspaces,
  selectedWorkspaceId,
  appCatalog,
  hidePrimaryNav = false,
}: RiskAiAppShellRailProps) {
  const pathname = usePathname();
  const projectIdInUrl = projectIdFromAppPathname(pathname);
  const projectWorkspaceId = useProjectWorkspaceId(pathname);
  const railWorkspace = resolveRailWorkspace({
    workspaces,
    pathnameWorkspaceId: workspaceIdFromAppPathname(pathname),
    projectWorkspaceId,
    selectedWorkspaceId,
  });
  const workspaceId = railWorkspace?.id ?? null;

  const workspaceOverviewHref =
    workspaceId != null ? riskaiPath(`/workspaces/${workspaceId}`) : null;
  const workspaceProjectsHref =
    workspaceId != null ? riskaiPath(`/workspaces/${workspaceId}/projects`) : null;
  const workspaceSettingsHref =
    workspaceId != null ? riskaiPath(`/workspaces/${workspaceId}/settings`) : null;
  const projectHrefs = projectIdInUrl != null ? riskAiProjectRailHrefs(projectIdInUrl) : null;
  const projectOverviewHref = projectHrefs?.overview ?? null;
  const risksHref = projectHrefs?.risks ?? null;
  const simulationHref = projectHrefs?.simulation ?? null;
  const reportHref = projectHrefs?.report ?? null;
  const projectSettingsHref = projectHrefs?.settings ?? null;

  const activeNav = resolveActivePrimaryNav(pathname, workspaceId);
  const accountRailActive = isAccountSettingsRouteActive(pathname);
  const hideWorkspaceProjectNav = shouldHideAppShellPrimaryNav(pathname, hidePrimaryNav);

  return (
    <AppShellRail ariaLabel="RiskAI navigation" pinnedStorageKey={RISKAI_APP_SHELL_RAIL_PINNED_KEY}>
      <AppShellRailBody>
        <AppShellRailHeader>
          <AppShellRailBrandAppMenu
            appShortName="RiskAI"
            currentAppId="riskai"
            catalog={appCatalog}
            brandIcon={<AppShellRailBrandMark alt="" />}
            homeHref={HOME_PATH}
          />

          {hideWorkspaceProjectNav ? null : (
            <>
              <AppShellRailSeparator />

              <AppShellRailNavScroll>
                <nav className={appShellRailPrimaryNavClassName} aria-label="Primary">
                  {railWorkspace != null && workspaceOverviewHref != null ? (
                    <AppShellRailNavSection label="Workspace">
                      <RiskAiWorkspaceRailList
                        workspace={railWorkspace}
                        overviewHref={workspaceOverviewHref}
                        active={activeNav === "workspaceOverview"}
                      />
                      {workspaceProjectsHref != null ? (
                        <AppShellRailNavLink
                          href={workspaceProjectsHref}
                          active={activeNav === "workspaceProjects"}
                          label="Projects"
                        >
                          <IconProjectsList />
                        </AppShellRailNavLink>
                      ) : null}
                      {workspaceSettingsHref != null ? (
                        <AppShellRailNavLink
                          href={workspaceSettingsHref}
                          active={activeNav === "workspaceSettings"}
                          label="Workspace Settings"
                        >
                          <IconSettings />
                        </AppShellRailNavLink>
                      ) : null}
                    </AppShellRailNavSection>
                  ) : null}
                  {projectOverviewHref != null ? (
                    <AppShellRailNavSection label="Project">
                      <AppShellRailNavLink
                        href={projectOverviewHref}
                        active={activeNav === "projectOverview"}
                        label="Project Overview"
                      >
                        <IconProjectOverview />
                      </AppShellRailNavLink>
                      {risksHref != null ? (
                        <AppShellRailNavLink href={risksHref} active={activeNav === "risks"} label="Risks">
                          <IconRisks />
                        </AppShellRailNavLink>
                      ) : null}
                      {simulationHref != null ? (
                        <AppShellRailNavLink href={simulationHref} active={activeNav === "simulation"} label="Simulation">
                          <IconSimulation />
                        </AppShellRailNavLink>
                      ) : null}
                      {reportHref != null ? (
                        <AppShellRailNavLink href={reportHref} active={activeNav === "report"} label="Report">
                          <IconReport />
                        </AppShellRailNavLink>
                      ) : null}
                      {projectSettingsHref != null ? (
                        <AppShellRailNavLink
                          href={projectSettingsHref}
                          active={activeNav === "projectSettings"}
                          label="Project Settings"
                        >
                          <IconSettings />
                        </AppShellRailNavLink>
                      ) : null}
                    </AppShellRailNavSection>
                  ) : null}
                </nav>
              </AppShellRailNavScroll>
            </>
          )}
        </AppShellRailHeader>

        <AppShellRailFooter pinCollapse>
          <AppShellRailFooterAccount>
            <RiskAiRailAccountMenu railPageActive={accountRailActive} />
          </AppShellRailFooterAccount>
        </AppShellRailFooter>
      </AppShellRailBody>
    </AppShellRail>
  );
}
